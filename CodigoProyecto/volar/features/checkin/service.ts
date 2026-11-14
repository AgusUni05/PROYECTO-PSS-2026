import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/action-result";
import { checkinWindowState, openCheckinDepartureRange } from "./window";

const WINDOW_ERRORS = {
  "not-open": "El check-in todavía no está habilitado: abre 24 horas antes de la salida.",
  closed: "El check-in de este vuelo ya cerró.",
} as const;

class CheckinChangedError extends Error {
  constructor() {
    super("CHECKIN_CHANGED");
  }
}

/**
 * US-38: check-in online de los pasajeros elegidos de una reserva propia.
 * `buyerId` sale siempre de la sesión. Cada pasaje se evalúa con su vuelo
 * actual (puede diferir del de la reserva tras una reprogramación de US-26).
 * Es idempotente: un pasajero que ya hizo el check-in no se vuelve a marcar.
 */
export async function checkInPassengers(
  code: string,
  buyerId: string,
  ticketIds: string[],
  now: Date = new Date(),
): Promise<ActionResult<{ checkedIn: number }>> {
  const requested = [...new Set(ticketIds)];
  if (requested.length === 0) return { ok: false, error: "Elegí al menos un pasajero." };

  const booking = await prisma.booking.findFirst({
    where: { code, buyerId },
    select: {
      id: true,
      status: true,
      tickets: {
        where: { id: { in: requested } },
        select: {
          id: true,
          status: true,
          checkedInAt: true,
          flight: { select: { status: true, departureAt: true } },
        },
      },
    },
  });

  if (!booking) return { ok: false, error: "No encontramos la reserva indicada." };
  if (booking.status !== "CONFIRMED") return { ok: false, error: "La compra no está confirmada." };
  if (booking.tickets.length !== requested.length) {
    return { ok: false, error: "Alguno de los pasajeros elegidos no pertenece a esta reserva." };
  }

  for (const ticket of booking.tickets) {
    if (ticket.status !== "ISSUED") {
      return { ok: false, error: "Alguno de los pasajes elegidos ya no está activo." };
    }
    if (ticket.flight.status !== "SCHEDULED") {
      return { ok: false, error: "El vuelo de alguno de los pasajes no está programado." };
    }
    const state = checkinWindowState(ticket.flight.departureAt, now);
    if (state !== "open") return { ok: false, error: WINDOW_ERRORS[state] };
  }

  const pending = booking.tickets.filter((ticket) => ticket.checkedInAt === null).map((t) => t.id);
  if (pending.length === 0) return { ok: true, data: { checkedIn: 0 } };

  try {
    await prisma.$transaction(async (tx) => {
      // Revalida pasaje, vuelo y ventana en la escritura: si algo cambió desde
      // la lectura (reembolso, cancelación, cambio de horario), no se marca nada.
      const { count } = await tx.ticket.updateMany({
        where: {
          id: { in: pending },
          bookingId: booking.id,
          status: "ISSUED",
          checkedInAt: null,
          flight: { is: { status: "SCHEDULED", departureAt: openCheckinDepartureRange(now) } },
        },
        data: { checkedInAt: now },
      });
      if (count !== pending.length) throw new CheckinChangedError();
    });
  } catch (error) {
    if (error instanceof CheckinChangedError) {
      return {
        ok: false,
        error: "La reserva o el vuelo cambiaron mientras hacías el check-in. Volvé a intentarlo.",
      };
    }
    throw error;
  }

  return { ok: true, data: { checkedIn: pending.length } };
}
