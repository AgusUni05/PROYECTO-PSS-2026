import { prisma } from "@/lib/prisma";
import { availableSeats, isOnSale } from "@/features/flights/availability";
import { voluntaryBlock, type CancellationBlock } from "@/features/cancellation/quote";
import { loadCancellableBooking, type CancellableBooking } from "@/features/cancellation/queries";
import { buildChangeQuote, MAX_CHANGE_CANDIDATES, type ChangeCandidate, type ChangeQuote } from "./quote";

export type ChangeOptions = {
  booking: CancellableBooking;
  blocked: CancellationBlock | null;
  candidates: ChangeCandidate[];
};

/**
 * US-39: reserva propia y vuelos a los que se puede cambiar: misma ruta que el
 * vuelo actual, a la venta (la misma regla del buscador), distintos del actual
 * y con cupo en la clase para todos los pasajes; solo los más próximos
 * (MAX_CHANGE_CANDIDATES). `buyerId` sale de la sesión.
 */
export async function getChangeOptions(
  code: string,
  buyerId: string,
  now: Date = new Date(),
): Promise<ChangeOptions | null> {
  const booking = await loadCancellableBooking(code, buyerId);
  if (!booking) return null;

  const blocked = voluntaryBlock(booking, now);
  if (blocked) return { booking, blocked, candidates: [] };

  const currentFlightIds = [...new Set(booking.tickets.map((ticket) => ticket.flight.id))];
  const current = await prisma.flight.findUnique({
    where: { id: currentFlightIds[0] },
    select: { routeId: true },
  });
  if (!current) return { booking, blocked: null, candidates: [] };

  const seatClass = booking.tickets[0].seatClass;
  const flights = await prisma.flight.findMany({
    where: {
      routeId: current.routeId,
      id: { notIn: currentFlightIds },
      status: "SCHEDULED",
      departureAt: { gt: now },
    },
    orderBy: { departureAt: "asc" },
    select: {
      id: true,
      code: true,
      date: true,
      departureAt: true,
      arrivalAt: true,
      status: true,
      economyCapacity: true,
      economyOccupied: true,
      firstClassCapacity: true,
      firstClassOccupied: true,
      economyFare: true,
      firstClassFare: true,
      salesPeriod: { select: { startDate: true, endDate: true } },
    },
  });

  const candidates = flights.flatMap((flight): ChangeCandidate[] => {
    if (!isOnSale(flight, now)) return [];
    const capacity = seatClass === "FIRST" ? flight.firstClassCapacity : flight.economyCapacity;
    const occupied = seatClass === "FIRST" ? flight.firstClassOccupied : flight.economyOccupied;
    const available = availableSeats(capacity, occupied);
    if (available < booking.tickets.length) return [];
    return [
      {
        id: flight.id,
        code: flight.code,
        date: flight.date,
        departureAt: flight.departureAt,
        arrivalAt: flight.arrivalAt,
        fare: (seatClass === "FIRST" ? flight.firstClassFare : flight.economyFare).toString(),
        available,
        capacity,
      },
    ];
  });

  return { booking, blocked: null, candidates: candidates.slice(0, MAX_CHANGE_CANDIDATES) };
}

export type ChangeView = ChangeOptions & {
  /** Vuelo elegido y su liquidación; null si no se eligió uno elegible. */
  selected: { candidate: ChangeCandidate; quote: ChangeQuote } | null;
};

/** US-39: datos de la pantalla de cambio, con la liquidación del vuelo elegido (si es elegible). */
export async function getChangeView(
  code: string,
  buyerId: string,
  selectedFlightId: string | undefined,
  now: Date = new Date(),
): Promise<ChangeView | null> {
  const options = await getChangeOptions(code, buyerId, now);
  if (!options) return null;

  const candidate = options.candidates.find((flight) => flight.id === selectedFlightId);
  return {
    ...options,
    selected: candidate ? { candidate, quote: buildChangeQuote(options.booking, candidate, now) } : null,
  };
}
