import { prisma } from "@/lib/prisma";
import type { BookingStatus, SeatClass } from "@/generated/prisma/enums";
import { getCheckinView, type CheckinFlightGroup } from "@/features/checkin/queries";
import { cabinSection, type CabinSection } from "./cabin";

export type SeatPassenger = { id: string; name: string; seat: string | null };

export type SeatSelectionFlight = {
  flight: CheckinFlightGroup["flight"];
  boardingAt: Date;
  seatClass: SeatClass;
  /** Sección de la clase comprada: la única habilitada en el mapa. */
  section: CabinSection;
  /** La otra clase, que el mapa muestra bloqueada; null si el vuelo no la tiene. */
  otherClass: SeatClass | null;
  /**
   * Asientos tomados por otros pasajes de cualquier clase (y por los de la
   * reserva que ya hicieron el check-in): el asiento es único por vuelo.
   */
  occupied: string[];
  /** Pasajeros sin check-in: los que pueden elegir asiento. */
  passengers: SeatPassenger[];
};

export type SeatSelectionView = {
  code: string;
  status: BookingStatus;
  flights: SeatSelectionFlight[];
};

/**
 * US-37: datos del paso 1 del check-in (seleccion_asiento.html). Solo los
 * vuelos con la ventana de check-in abierta y pasajeros sin check-in: después
 * del check-in el asiento queda fijo. `buyerId` sale de la sesión.
 */
export async function getSeatSelectionView(
  code: string,
  buyerId: string,
  now: Date = new Date(),
): Promise<SeatSelectionView | null> {
  const view = await getCheckinView(code, buyerId, now);
  if (!view) return null;

  const open = view.groups.filter(
    (group) => group.state === "open" && group.passengers.some((p) => p.checkedInAt === null),
  );
  if (view.status !== "CONFIRMED" || open.length === 0) {
    return { code: view.code, status: view.status, flights: [] };
  }

  const capacities = await prisma.flight.findMany({
    where: { id: { in: open.map((group) => group.flight.id) } },
    select: { id: true, economyCapacity: true, firstClassCapacity: true },
  });

  const flights = await Promise.all(
    open.map(async (group): Promise<SeatSelectionFlight | null> => {
      const cabin = capacities.find((flight) => flight.id === group.flight.id);
      if (!cabin) return null;
      const pending = group.passengers.filter((p) => p.checkedInAt === null);
      const seatClass = pending[0].seatClass;
      const otherClass: SeatClass = seatClass === "FIRST" ? "ECONOMY" : "FIRST";

      const taken = await prisma.ticket.findMany({
        where: {
          flightId: group.flight.id,
          seat: { not: null },
          id: { notIn: pending.map((p) => p.id) },
        },
        select: { seat: true },
      });

      return {
        flight: group.flight,
        boardingAt: group.boardingAt,
        seatClass,
        section: cabinSection(cabin, seatClass),
        otherClass: cabinSection(cabin, otherClass).seats.length > 0 ? otherClass : null,
        occupied: taken.flatMap((ticket) => ticket.seat ?? []),
        passengers: pending.map((p) => ({ id: p.id, name: `${p.lastName}, ${p.firstName}`, seat: p.seat })),
      };
    }),
  );

  return {
    code: view.code,
    status: view.status,
    flights: flights.filter((flight): flight is SeatSelectionFlight => flight !== null),
  };
}
