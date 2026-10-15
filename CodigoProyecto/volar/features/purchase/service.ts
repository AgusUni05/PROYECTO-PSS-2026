import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/id";
import type { ActionResult } from "@/lib/action-result";
import type { BookingStatus } from "@/generated/prisma/enums";
import type { PaymentFormValues } from "./schema";
import { isHoldExpired } from "./queries";
import { issueComprobantes } from "./issuance";

// Nombre de la pasarela simulada (US-21). No hay integración real: el
// resultado se deriva de la tarjeta, ver simulateGateway.
const GATEWAY = "VolarPay (simulada)";
const REJECTION_REASON = "Fondos insuficientes o límite de tarjeta excedido";

export type PaymentOutcome = {
  status: "APPROVED" | "REJECTED";
  transactionId: string;
  bookingCode: string;
  rejectionReason: string | null;
};

/** US-20/RNF-08: marca según el primer dígito. El número completo se descarta. */
export function cardBrand(cardNumber: string): string {
  switch (cardNumber[0]) {
    case "4":
      return "VISA";
    case "5":
      return "MASTERCARD";
    case "3":
      return "AMEX";
    default:
      return "OTRA";
  }
}

/**
 * US-21: pasarela simulada. Aprueba si el último dígito de la tarjeta es par y
 * rechaza si es impar (permite probar ambos casos de forma determinista). El
 * id de transacción se genera igual que lo haría la pasarela real.
 */
function simulateGateway(cardNumber: string): { approved: boolean; transactionId: string } {
  return {
    approved: Number(cardNumber.slice(-1)) % 2 === 0,
    transactionId: `TX-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
  };
}

function notPayableMessage(status: BookingStatus): string {
  switch (status) {
    case "CONFIRMED":
      return "La reserva ya fue pagada y confirmada.";
    case "REJECTED":
      return "El pago de esta reserva fue rechazado. Reiniciá la compra para volver a intentarlo.";
    case "EXPIRED":
      return "La reserva venció. Reiniciá la compra.";
    case "CANCELLED":
      return "La reserva fue cancelada.";
    default:
      return "La reserva no se puede pagar.";
  }
}

/**
 * US-20/US-21/US-22: procesa el pago de una reserva con la pasarela simulada y
 * registra el intento. Aprobado: la compra pasa a CONFIRMED (los cupos, ya
 * retenidos como hold, quedan vendidos) y US-23 emite los comprobantes.
 * Rechazado: la compra pasa a REJECTED, se libera el cupo retenido y se
 * cancelan los pasajes. Nunca se persisten datos sensibles de la tarjeta
 * (RNF-08): solo la marca y los últimos 4 dígitos.
 */
export async function processPayment(
  code: string,
  values: PaymentFormValues,
): Promise<ActionResult<PaymentOutcome>> {
  const booking = await prisma.booking.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      status: true,
      holdExpiresAt: true,
      quantity: true,
      totalAmount: true,
      flightId: true,
      seatClass: true,
      contactName: true,
      contactEmail: true,
      flight: { select: { code: true, economyCapacity: true, firstClassCapacity: true } },
      tickets: {
        orderBy: { createdAt: "asc" },
        select: { id: true, firstName: true, lastName: true, unitPrice: true },
      },
    },
  });

  if (!booking) return { ok: false, error: "No encontramos la reserva indicada." };
  if (booking.status !== "PENDING_PAYMENT") {
    return { ok: false, error: notPayableMessage(booking.status) };
  }

  const now = new Date();
  if (isHoldExpired(booking.holdExpiresAt, now)) {
    return {
      ok: false,
      error: "La reserva venció (la retención de cupo dura 10 minutos). Volvé a iniciar la compra.",
    };
  }

  const cardNumber = values.numeroTarjeta.replace(/\D/g, "");
  const { approved, transactionId } = simulateGateway(cardNumber);
  const status = approved ? "APPROVED" : "REJECTED";

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          id: newId("Payment"),
          bookingId: booking.id,
          amount: booking.totalAmount,
          status,
          gateway: GATEWAY,
          transactionId,
          cardBrand: cardBrand(cardNumber),
          cardLast4: cardNumber.slice(-4),
          rejectionReason: approved ? null : REJECTION_REASON,
          processedAt: now,
        },
      });

      const { count } = await tx.booking.updateMany({
        where: { id: booking.id, status: "PENDING_PAYMENT", holdExpiresAt: { gt: now } },
        data: approved ? { status: "CONFIRMED", confirmedAt: now } : { status: "REJECTED" },
      });
      if (count === 0) throw new Error("BOOKING_CHANGED");

      // US-21: el rechazo no procesa la compra: cancela los pasajes y libera el
      // cupo retenido. La aprobación no toca los contadores (los asientos ya
      // estaban retenidos por el hold y pasan a vendidos) y dispara la emisión
      // de los comprobantes (US-23/US-24).
      if (!approved) {
        await tx.ticket.updateMany({
          where: { bookingId: booking.id, status: "PENDING" },
          data: { status: "CANCELLED" },
        });
        await tx.flight.updateMany({
          where:
            booking.seatClass === "ECONOMY"
              ? { id: booking.flightId, economyOccupied: { gte: booking.quantity } }
              : { id: booking.flightId, firstClassOccupied: { gte: booking.quantity } },
          data:
            booking.seatClass === "ECONOMY"
              ? { economyOccupied: { decrement: booking.quantity } }
              : { firstClassOccupied: { decrement: booking.quantity } },
        });
      } else {
        await issueComprobantes(tx, booking, now);
      }
    });
  } catch {
    return {
      ok: false,
      error: "La reserva cambió mientras se procesaba el pago. Volvé a intentarlo.",
    };
  }

  return {
    ok: true,
    data: {
      status,
      transactionId,
      bookingCode: code,
      rejectionReason: approved ? null : REJECTION_REASON,
    },
  };
}
