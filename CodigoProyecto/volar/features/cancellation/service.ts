import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/id";
import type { ActionResult } from "@/lib/action-result";
import type { SeatClass } from "@/generated/prisma/enums";
import { volarPayRefundGateway, type RefundGateway } from "@/features/flights/volar-pay-gateway";
import { CANCELLATION_REASON_LABELS, type CancellationReason } from "./policy";
import { buildCancellationQuote, CANCELLATION_BLOCK_MESSAGES } from "./quote";
import { loadCancellableBooking } from "./queries";

class CancellationChangedError extends Error {
  constructor() {
    super("CANCELLATION_CHANGED");
  }
}

/**
 * US-39: cancelación voluntaria de la reserva completa a pedido del pasajero.
 * Liquida cada pasaje emitido con la política de penalidades, lo reembolsa
 * (pasarela simulada, como US-26), libera su asiento y el cupo de su clase, y
 * deja la reserva cancelada. Todo en una transacción que revalida reserva,
 * pasajes y vuelos al escribir: si algo cambió, no se cancela nada.
 */
export async function cancelBookingVoluntarily(
  code: string,
  buyerId: string,
  reason: CancellationReason,
  now: Date = new Date(),
  gateway: RefundGateway = volarPayRefundGateway,
): Promise<ActionResult<{ cancelled: number; penalty: string; refund: string }>> {
  const booking = await loadCancellableBooking(code, buyerId);
  if (!booking) return { ok: false, error: "No encontramos la reserva indicada." };

  const quote = buildCancellationQuote(booking, now);
  if (quote.blocked) return { ok: false, error: CANCELLATION_BLOCK_MESSAGES[quote.blocked] };

  const ticketIds = quote.lines.map((line) => line.ticketId);

  try {
    await prisma.$transaction(async (tx) => {
      const reserved = await tx.booking.updateMany({
        where: { id: booking.id, buyerId, status: "CONFIRMED" },
        data: { status: "CANCELLED" },
      });
      if (reserved.count === 0) throw new CancellationChangedError();

      // El asiento queda libre (null) para que se pueda volver a vender.
      const tickets = await tx.ticket.updateMany({
        where: {
          id: { in: ticketIds },
          bookingId: booking.id,
          status: "ISSUED",
          contingencies: { none: { resolution: "PENDING" } },
          flight: { is: { status: "SCHEDULED", departureAt: { gt: now } } },
        },
        data: { status: "REFUNDED", seat: null },
      });
      if (tickets.count !== ticketIds.length) throw new CancellationChangedError();

      const released = new Map<string, { flightId: string; seatClass: SeatClass; count: number }>();
      for (const line of quote.lines) {
        const { gatewayRefundId } = await gateway.processRefund({
          amount: Number(line.refund),
          ticketId: line.ticketId,
        });
        await tx.refund.create({
          data: {
            id: newId("Refund"),
            ticketId: line.ticketId,
            amount: line.refund,
            penaltyAmount: line.penalty,
            reason: CANCELLATION_REASON_LABELS[reason],
            status: "COMPLETED",
            gatewayRefundId,
            processedAt: now,
          },
        });

        const key = `${line.flight.id}:${line.seatClass}`;
        const entry = released.get(key) ?? { flightId: line.flight.id, seatClass: line.seatClass, count: 0 };
        entry.count += 1;
        released.set(key, entry);
      }

      for (const { flightId, seatClass, count } of released.values()) {
        await tx.flight.update({
          where: { id: flightId },
          data:
            seatClass === "FIRST"
              ? { firstClassOccupied: { decrement: count } }
              : { economyOccupied: { decrement: count } },
        });
      }
    });
  } catch (error) {
    if (error instanceof CancellationChangedError) {
      return { ok: false, error: "La reserva cambió mientras la cancelabas. Volvé a intentarlo." };
    }
    throw error;
  }

  return {
    ok: true,
    data: { cancelled: quote.lines.length, penalty: quote.totals.penalty, refund: quote.totals.refund },
  };
}
