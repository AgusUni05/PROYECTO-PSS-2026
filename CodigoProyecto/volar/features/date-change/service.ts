import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/id";
import type { ActionResult } from "@/lib/action-result";
import { Prisma } from "@/generated/prisma/client";
import { CANCELLATION_BLOCK_MESSAGES } from "@/features/cancellation/quote";
import { assignSeats, seatLetters, seatRows, ticketNumber } from "@/features/purchase/issuance";
import { cardBrand, simulateGateway } from "@/features/purchase/service";
import type { PaymentFormValues } from "@/features/purchase/schema";
import { getChangeOptions } from "./queries";
import { buildChangeQuote } from "./quote";

/** Pasarela del adicional: identifica estos pagos frente al de la compra original. */
export const CHANGE_PAYMENT_GATEWAY = "VolarPay (simulada) · Cambio voluntario de fecha";
const REJECTION_REASON = "Fondos insuficientes o límite de tarjeta excedido";

const CHANGE_ERRORS = {
  NO_CAPACITY: "Se agotaron los cupos del vuelo elegido. No se realizó ningún cobro; elegí otra opción.",
  CHANGED: "La reserva cambió mientras hacías el cambio. No se realizó ningún cobro; volvé a intentarlo.",
} as const;

class ChangeAbortedError extends Error {
  constructor(readonly reason: keyof typeof CHANGE_ERRORS) {
    super(reason);
  }
}

/**
 * US-39: cambio voluntario de fecha de la reserva completa a otro vuelo de la
 * misma ruta, cobrando el adicional (penalidad + diferencia de tarifa) con la
 * pasarela simulada de la compra. Si el pago se rechaza, queda registrado y la
 * reserva no cambia. Si se aprueba, en una transacción que revalida todo: toma
 * el cupo nuevo, libera el anterior y reemite cada e-ticket con vuelo, asiento
 * y número nuevos (como la reprogramación de US-26). Si algo cambió, no se
 * registra el cobro ni se mueve ningún pasaje.
 */
export async function changeBookingDate(
  code: string,
  buyerId: string,
  newFlightId: string,
  payment: PaymentFormValues,
  now: Date = new Date(),
): Promise<ActionResult<{ flightCode: string; total: string; transactionId: string }>> {
  const options = await getChangeOptions(code, buyerId, now);
  if (!options) return { ok: false, error: "No encontramos la reserva indicada." };
  if (options.blocked) return { ok: false, error: CANCELLATION_BLOCK_MESSAGES[options.blocked] };

  const candidate = options.candidates.find((flight) => flight.id === newFlightId);
  if (!candidate) {
    return { ok: false, error: "El vuelo elegido ya no está disponible. Elegí otra opción." };
  }

  const { booking } = options;
  const quote = buildChangeQuote(booking, candidate, now);
  const cardNumber = payment.numeroTarjeta.replace(/\D/g, "");
  const { approved, transactionId } = simulateGateway(cardNumber);
  const paymentId = newId("Payment");
  const paymentData = {
    id: paymentId,
    bookingId: booking.id,
    amount: quote.total,
    gateway: CHANGE_PAYMENT_GATEWAY,
    transactionId,
    cardBrand: cardBrand(cardNumber),
    cardLast4: cardNumber.slice(-4),
    processedAt: now,
  };

  if (!approved) {
    await prisma.payment.create({
      data: { ...paymentData, status: "REJECTED", rejectionReason: REJECTION_REASON },
    });
    return { ok: false, error: `El pago fue rechazado (${REJECTION_REASON}). La reserva no cambió.` };
  }

  const seatClass = booking.tickets[0].seatClass;
  const quantity = quote.lines.length;
  const occupiedField = seatClass === "FIRST" ? "firstClassOccupied" : "economyOccupied";
  const numberSuffix = `C${paymentId.split("_").at(-1)?.slice(-8)}`;

  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.booking.updateMany({
        where: { id: booking.id, buyerId, status: "CONFIRMED" },
        data: { updatedAt: now },
      });
      if (locked.count === 0) throw new ChangeAbortedError("CHANGED");

      const taken = await tx.flight.updateMany({
        where: {
          id: candidate.id,
          status: "SCHEDULED",
          departureAt: { gt: now },
          [occupiedField]: { lte: candidate.capacity - quantity },
        },
        data: { [occupiedField]: { increment: quantity } },
      });
      if (taken.count === 0) throw new ChangeAbortedError("NO_CAPACITY");

      const releasedByFlight = new Map<string, number>();
      for (const ticket of booking.tickets) {
        releasedByFlight.set(ticket.flight.id, (releasedByFlight.get(ticket.flight.id) ?? 0) + 1);
      }
      for (const [flightId, count] of releasedByFlight) {
        await tx.flight.update({
          where: { id: flightId },
          data: { [occupiedField]: { decrement: count } },
        });
      }

      const occupiedSeats = await tx.ticket.findMany({
        where: { flightId: candidate.id, seatClass, seat: { not: null } },
        select: { seat: true },
        distinct: ["seat"],
      });
      const seats = assignSeats(
        occupiedSeats.flatMap((row) => row.seat ?? []),
        quantity,
        seatRows(seatClass, candidate.capacity),
        seatLetters(seatClass),
      );
      if (seats.length < quantity) throw new ChangeAbortedError("NO_CAPACITY");

      for (const [index, line] of quote.lines.entries()) {
        const moved = await tx.ticket.updateMany({
          where: {
            id: line.ticketId,
            bookingId: booking.id,
            status: "ISSUED",
            contingencies: { none: { resolution: "PENDING" } },
          },
          data: {
            flightId: candidate.id,
            seat: seats[index],
            number: ticketNumber(booking.code, index, numberSuffix),
            issuedAt: now,
            unitPrice: line.newUnitPrice,
          },
        });
        if (moved.count !== 1) throw new ChangeAbortedError("CHANGED");
      }

      await tx.payment.create({ data: { ...paymentData, status: "APPROVED" } });
    });
  } catch (error) {
    if (error instanceof ChangeAbortedError) return { ok: false, error: CHANGE_ERRORS[error.reason] };
    // Choque de asiento o número con otra operación concurrente: la transacción se revirtió.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: CHANGE_ERRORS.NO_CAPACITY };
    }
    throw error;
  }

  return { ok: true, data: { flightCode: candidate.code, total: quote.total, transactionId } };
}
