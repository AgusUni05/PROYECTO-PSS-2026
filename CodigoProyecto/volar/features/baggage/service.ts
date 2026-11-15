import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/id";
import type { ActionResult } from "@/lib/action-result";
import { cardBrand, simulateGateway } from "@/features/purchase/service";
import type { PaymentFormValues } from "@/features/purchase/schema";
import { checkinWindowState, openCheckinDepartureRange } from "@/features/checkin/window";
import { BAGGAGE_UNIT_PRICE, MAX_EXTRA_BAGS, baggageTotal } from "./pricing";

/** Pasarela del equipaje: identifica estos pagos frente al de la compra original. */
export const BAGGAGE_PAYMENT_GATEWAY = "VolarPay (simulada) · Equipaje adicional";
const REJECTION_REASON = "Fondos insuficientes o límite de tarjeta excedido";

const WINDOW_ERRORS = {
  "not-open": "El check-in todavía no está habilitado: abre 24 horas antes de la salida.",
  closed: "El check-in de este vuelo ya cerró.",
} as const;

class BaggageChangedError extends Error {
  constructor() {
    super("BAGGAGE_CHANGED");
  }
}

export type BaggageSelection = { ticketId: string; bags: number };

/**
 * US-41: compra de valijas adicionales en bodega durante el check-in de una
 * reserva propia. `buyerId` sale siempre de la sesión. Solo para pasajeros que
 * todavía no confirmaron el check-in, con la ventana abierta y hasta
 * MAX_EXTRA_BAGS valijas por pasajero. Si el pago se rechaza queda registrado
 * y no cambia nada; si se aprueba, en una transacción que revalida todo suma
 * las valijas a cada pasaje, registra el pago y agrega el desglose a la factura.
 */
export async function addExtraBaggage(
  code: string,
  buyerId: string,
  selections: BaggageSelection[],
  payment: PaymentFormValues,
  now: Date = new Date(),
): Promise<ActionResult<{ bags: number; total: number; transactionId: string }>> {
  if (selections.length === 0) return { ok: false, error: "Elegí al menos una valija." };

  const booking = await prisma.booking.findFirst({
    where: { code, buyerId },
    select: {
      id: true,
      status: true,
      tickets: {
        where: { id: { in: selections.map((selection) => selection.ticketId) } },
        select: {
          id: true,
          status: true,
          checkedInAt: true,
          extraBags: true,
          firstName: true,
          lastName: true,
          flight: { select: { code: true, status: true, departureAt: true } },
        },
      },
    },
  });

  if (!booking) return { ok: false, error: "No encontramos la reserva indicada." };
  if (booking.status !== "CONFIRMED") return { ok: false, error: "La compra no está confirmada." };
  if (booking.tickets.length !== selections.length) {
    return { ok: false, error: "Alguno de los pasajeros elegidos no pertenece a esta reserva." };
  }

  const tickets = new Map(booking.tickets.map((ticket) => [ticket.id, ticket]));
  for (const { ticketId, bags } of selections) {
    const ticket = tickets.get(ticketId)!;
    if (ticket.status !== "ISSUED") {
      return { ok: false, error: "Alguno de los pasajes elegidos ya no está activo." };
    }
    if (ticket.flight.status !== "SCHEDULED") {
      return { ok: false, error: "El vuelo de alguno de los pasajes no está programado." };
    }
    const state = checkinWindowState(ticket.flight.departureAt, now);
    if (state !== "open") return { ok: false, error: WINDOW_ERRORS[state] };
    if (ticket.checkedInAt !== null) {
      return {
        ok: false,
        error: "El equipaje adicional se agrega antes de confirmar el check-in del pasajero.",
      };
    }
    if (ticket.extraBags + bags > MAX_EXTRA_BAGS) {
      return {
        ok: false,
        error: `Cada pasajero puede llevar hasta ${MAX_EXTRA_BAGS} valijas adicionales.`,
      };
    }
  }

  const totalBags = selections.reduce((sum, selection) => sum + selection.bags, 0);
  const total = baggageTotal(totalBags);
  const cardNumber = payment.numeroTarjeta.replace(/\D/g, "");
  const { approved, transactionId } = simulateGateway(cardNumber);
  const paymentData = {
    id: newId("Payment"),
    bookingId: booking.id,
    amount: total,
    gateway: BAGGAGE_PAYMENT_GATEWAY,
    transactionId,
    cardBrand: cardBrand(cardNumber),
    cardLast4: cardNumber.slice(-4),
    processedAt: now,
  };

  if (!approved) {
    await prisma.payment.create({
      data: { ...paymentData, status: "REJECTED", rejectionReason: REJECTION_REASON },
    });
    return {
      ok: false,
      error: `El pago fue rechazado (${REJECTION_REASON}). No se agregó equipaje.`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Revalida pasaje, vuelo, ventana y valijas previas en la escritura: si
      // algo cambió desde la lectura (otro envío, check-in, reembolso), no se
      // registra el cobro ni se suma ninguna valija.
      for (const { ticketId, bags } of selections) {
        const { count } = await tx.ticket.updateMany({
          where: {
            id: ticketId,
            bookingId: booking.id,
            status: "ISSUED",
            checkedInAt: null,
            extraBags: tickets.get(ticketId)!.extraBags,
            flight: { is: { status: "SCHEDULED", departureAt: openCheckinDepartureRange(now) } },
          },
          data: { extraBags: { increment: bags } },
        });
        if (count !== 1) throw new BaggageChangedError();
      }

      await tx.payment.create({ data: { ...paymentData, status: "APPROVED" } });

      await tx.invoice.update({
        where: { bookingId: booking.id },
        data: {
          totalAmount: { increment: total },
          items: {
            create: selections.map(({ ticketId, bags }) => {
              const ticket = tickets.get(ticketId)!;
              return {
                id: newId("InvoiceItem"),
                description: `Equipaje adicional en bodega ${ticket.flight.code} - ${ticket.lastName}, ${ticket.firstName}`,
                quantity: bags,
                unitPrice: BAGGAGE_UNIT_PRICE,
                amount: baggageTotal(bags),
              };
            }),
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof BaggageChangedError) {
      return {
        ok: false,
        error: "La reserva o el vuelo cambiaron mientras agregabas el equipaje. No se realizó ningún cobro; volvé a intentarlo.",
      };
    }
    throw error;
  }

  return { ok: true, data: { bags: totalBags, total, transactionId } };
}
