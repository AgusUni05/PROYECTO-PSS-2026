import { prisma } from "@/lib/prisma";
import type { BookingStatus, DocumentType, SeatClass } from "@/generated/prisma/enums";
import { boardingTime, checkinOpensAt, checkinWindowState, type CheckinWindowState } from "./window";

export type CheckinPassenger = {
  id: string;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  seat: string | null;
  seatClass: SeatClass;
  number: string | null;
  checkedInAt: Date | null;
};

export type CheckinFlightGroup = {
  flight: {
    id: string;
    code: string;
    date: Date;
    departureAt: Date;
    origin: { code: string; city: string };
    destination: { code: string; city: string };
  };
  /** "unavailable": el vuelo fue cancelado o ya salió (no está programado). */
  state: CheckinWindowState | "unavailable";
  opensAt: Date;
  boardingAt: Date;
  passengers: CheckinPassenger[];
};

export type CheckinView = {
  code: string;
  status: BookingStatus;
  groups: CheckinFlightGroup[];
};

/**
 * US-38: datos de la pantalla de check-in de una reserva propia. `buyerId`
 * sale de la sesión; una reserva ajena y una inexistente devuelven null. Los
 * pasajeros se agrupan por su vuelo actual (US-26 puede haberlos reprogramado).
 */
export async function getCheckinView(
  code: string,
  buyerId: string,
  now: Date = new Date(),
): Promise<CheckinView | null> {
  const booking = await prisma.booking.findFirst({
    where: { code, buyerId },
    select: {
      code: true,
      status: true,
      tickets: {
        where: { status: "ISSUED" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          number: true,
          seat: true,
          seatClass: true,
          firstName: true,
          lastName: true,
          documentType: true,
          documentNumber: true,
          checkedInAt: true,
          flight: {
            select: {
              id: true,
              code: true,
              date: true,
              departureAt: true,
              status: true,
              route: {
                select: {
                  origin: { select: { code: true, city: true } },
                  destination: { select: { code: true, city: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!booking) return null;

  const groups = new Map<string, CheckinFlightGroup>();
  for (const { flight, ...passenger } of booking.tickets) {
    let group = groups.get(flight.id);
    if (!group) {
      group = {
        flight: {
          id: flight.id,
          code: flight.code,
          date: flight.date,
          departureAt: flight.departureAt,
          origin: flight.route.origin,
          destination: flight.route.destination,
        },
        state:
          flight.status === "SCHEDULED" ? checkinWindowState(flight.departureAt, now) : "unavailable",
        opensAt: checkinOpensAt(flight.departureAt),
        boardingAt: boardingTime(flight.departureAt),
        passengers: [],
      };
      groups.set(flight.id, group);
    }
    group.passengers.push(passenger);
  }

  return {
    code: booking.code,
    status: booking.status,
    groups: [...groups.values()].sort(
      (a, b) => a.flight.departureAt.getTime() - b.flight.departureAt.getTime(),
    ),
  };
}
