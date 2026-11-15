import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/action-result";
import { Prisma } from "@/generated/prisma/client";
import { checkinWindowState, openCheckinDepartureRange } from "@/features/checkin/window";
import { cabinSection } from "./cabin";

export type SeatChoice = { ticketId: string; seat: string };

const WINDOW_ERRORS = {
  "not-open": "La elección de asientos se habilita con el check-in, 24 horas antes de la salida.",
  closed: "El check-in de este vuelo ya cerró.",
} as const;

const TAKEN_ERROR = "Alguno de los asientos elegidos se acaba de ocupar. Elegí otro.";

class SeatsChangedError extends Error {
  constructor() {
    super("SEATS_CHANGED");
  }
}

/**
 * US-37: cambia el asiento de pasajeros de una reserva propia en un vuelo, en
 * el paso 1 del check-in: ventana abierta y pasajeros sin check-in (después
 * queda fijo). Cada asiento tiene que ser de la clase del pasaje. El bloqueo
 * para otros compradores lo da la restricción única (vuelo, asiento): si dos
 * eligen el mismo a la vez, el segundo recibe un error y no cambia nada.
 */
export async function chooseSeats(
  code: string,
  buyerId: string,
  flightId: string,
  choices: SeatChoice[],
  now: Date = new Date(),
): Promise<ActionResult<{ changed: number }>> {
  if (choices.length === 0) return { ok: false, error: "Elegí al menos un asiento." };
  const ticketIds = choices.map((choice) => choice.ticketId);
  if (new Set(ticketIds).size !== choices.length) {
    return { ok: false, error: "Cada pasajero puede tener un solo asiento." };
  }
  if (new Set(choices.map((choice) => choice.seat)).size !== choices.length) {
    return { ok: false, error: "Dos pasajeros no pueden tener el mismo asiento." };
  }

  const booking = await prisma.booking.findFirst({
    where: { code, buyerId },
    select: {
      id: true,
      status: true,
      tickets: {
        where: { id: { in: ticketIds } },
        select: {
          id: true,
          status: true,
          seat: true,
          seatClass: true,
          checkedInAt: true,
          flightId: true,
          flight: {
            select: { status: true, departureAt: true, economyCapacity: true, firstClassCapacity: true },
          },
        },
      },
    },
  });

  if (!booking) return { ok: false, error: "No encontramos la reserva indicada." };
  if (booking.status !== "CONFIRMED") return { ok: false, error: "La compra no está confirmada." };
  if (booking.tickets.length !== choices.length) {
    return { ok: false, error: "Alguno de los pasajeros elegidos no pertenece a esta reserva." };
  }

  for (const ticket of booking.tickets) {
    if (ticket.status !== "ISSUED" || ticket.flightId !== flightId) {
      return { ok: false, error: "Alguno de los pasajes elegidos no está activo en este vuelo." };
    }
    if (ticket.checkedInAt !== null) {
      return { ok: false, error: "Un pasajero que ya hizo el check-in no puede cambiar de asiento." };
    }
    if (ticket.flight.status !== "SCHEDULED") {
      return { ok: false, error: "El vuelo no está programado." };
    }
    const state = checkinWindowState(ticket.flight.departureAt, now);
    if (state !== "open") return { ok: false, error: WINDOW_ERRORS[state] };

    const seat = choices.find((choice) => choice.ticketId === ticket.id)?.seat ?? "";
    if (!cabinSection(ticket.flight, ticket.seatClass).seats.includes(seat)) {
      return { ok: false, error: `El asiento ${seat} no corresponde a la clase del pasaje.` };
    }
  }

  const changes = choices.filter(
    (choice) => booking.tickets.find((ticket) => ticket.id === choice.ticketId)?.seat !== choice.seat,
  );
  if (changes.length === 0) return { ok: true, data: { changed: 0 } };

  try {
    await prisma.$transaction(async (tx) => {
      // Libera primero los asientos actuales (así los pasajeros de la reserva
      // pueden intercambiarlos) revalidando pasaje, vuelo y ventana.
      const released = await tx.ticket.updateMany({
        where: {
          id: { in: changes.map((change) => change.ticketId) },
          bookingId: booking.id,
          flightId,
          status: "ISSUED",
          checkedInAt: null,
          flight: { is: { status: "SCHEDULED", departureAt: openCheckinDepartureRange(now) } },
        },
        data: { seat: null },
      });
      if (released.count !== changes.length) throw new SeatsChangedError();

      for (const change of changes) {
        await tx.ticket.update({ where: { id: change.ticketId }, data: { seat: change.seat } });
      }
    });
  } catch (error) {
    if (error instanceof SeatsChangedError) {
      return {
        ok: false,
        error: "La reserva o el vuelo cambiaron mientras elegías. Volvé a intentarlo.",
      };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: TAKEN_ERROR };
    }
    throw error;
  }

  return { ok: true, data: { changed: changes.length } };
}
