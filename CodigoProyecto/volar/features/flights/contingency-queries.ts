import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { ContingencyResolution, type SeatClass } from "@/generated/prisma/enums";
import { availableSeats } from "./availability";

export type ContingencyResolutionView =
  | {
      status: "PENDING";
      token: string;
      changeType: "SCHEDULE_CHANGE" | "CANCELLATION";
      passenger: {
        firstName: string;
        lastName: string;
        documentNumber: string;
      };
      ticket: {
        id: string;
        unitPrice: number;
        seatClass: SeatClass;
      };
      flight: {
        code: string;
        date: Date;
        origin: { code: string; city: string };
        destination: { code: string; city: string };
        departureAt: Date;
        arrivalAt: Date;
      };
      previousDepartureAt: Date;
      previousArrivalAt: Date;
      newDepartureAt: Date | null;
      newArrivalAt: Date | null;
    }
  | { status: "REFUND"; resolution: "REFUND"; resolvedAt: Date }
  | { status: "REBOOK"; resolution: "REBOOK"; resolvedAt: Date }
  | null;

/**
 * US-26: consulta pública de una contingencia por su `accessToken`.
 *
 * - No requiere sesión de Clerk: el token es el secreto de acceso limitado.
 * - Si no existe, devuelve `null`.
 * - Si ya fue resuelta, devuelve solo el estado final y la fecha de resolución,
 *   sin exponer datos del pasaje ni de otros viajeros.
 * - Si está pendiente, devuelve la información mínima necesaria para que el
 *   pasajero elija entre reprogramación y reembolso.
 */
export async function getContingencyByToken(
  accessToken: string,
): Promise<ContingencyResolutionView> {
  const contingency = await prisma.ticketContingency.findUnique({
    where: { accessToken },
    include: {
      ticket: {
        include: {
          booking: true,
          flight: {
            include: {
              route: {
                include: {
                  origin: true,
                  destination: true,
                },
              },
            },
          },
        },
      },
      flightChange: true,
    },
  });

  if (!contingency) return null;

  if (contingency.resolution === "REFUND") {
    return {
      status: "REFUND" as const,
      resolution: "REFUND" as const,
      resolvedAt: contingency.resolvedAt!,
    };
  }

  if (contingency.resolution === "REBOOK") {
    return {
      status: "REBOOK" as const,
      resolution: "REBOOK" as const,
      resolvedAt: contingency.resolvedAt!,
    };
  }

  const { ticket, flightChange } = contingency;
  const { flight } = ticket;
  const { route } = flight;

  return {
    status: "PENDING",
    token: contingency.accessToken,
    changeType: flightChange.type,
    passenger: {
      firstName: ticket.firstName,
      lastName: ticket.lastName,
      documentNumber: ticket.documentNumber,
    },
    ticket: {
      id: ticket.id,
      unitPrice: Number(ticket.unitPrice),
      seatClass: ticket.seatClass,
    },
    flight: {
      code: flight.code,
      date: flight.date,
      origin: {
        code: route.origin.code,
        city: route.origin.city,
      },
      destination: {
        code: route.destination.code,
        city: route.destination.city,
      },
      departureAt: flight.departureAt,
      arrivalAt: flight.arrivalAt,
    },
    previousDepartureAt: flightChange.previousDepartureAt,
    previousArrivalAt: flightChange.previousArrivalAt,
    newDepartureAt: flightChange.newDepartureAt,
    newArrivalAt: flightChange.newArrivalAt,
  };
}

export type RebookingAlternative = {
  id: string;
  code: string;
  date: Date;
  departureAt: Date;
  arrivalAt: Date;
  availableSeats: number;
};

type RebookingCriteria = {
  routeId: string;
  originalFlightId: string;
  now: Date;
};

/**
 * US-26: criterio único de "vuelo elegible" para reprogramar. La consulta de
 * alternativas y la revalidación transaccional lo comparten para que la UI y
 * el servidor no puedan discrepar. La capacidad de la clase se evalúa aparte
 * porque depende del ticket y no es una comparación entre columnas.
 */
export function rebookingCandidateWhere(
  criteria: RebookingCriteria & { flightId?: string },
): Prisma.FlightWhereInput {
  return {
    routeId: criteria.routeId,
    id: criteria.flightId
      ? { equals: criteria.flightId, not: criteria.originalFlightId }
      : { not: criteria.originalFlightId },
    status: "SCHEDULED",
    departureAt: { gt: criteria.now },
  };
}

async function getPendingRebookingContext(accessToken: string): Promise<{
  routeId: string;
  originalFlightId: string;
  seatClass: SeatClass;
} | null> {
  const contingency = await prisma.ticketContingency.findUnique({
    where: { accessToken },
    select: {
      resolution: true,
      ticket: {
        select: {
          flightId: true,
          seatClass: true,
          flight: { select: { routeId: true } },
        },
      },
    },
  });

  if (!contingency || contingency.resolution !== ContingencyResolution.PENDING) {
    return null;
  }

  return {
    routeId: contingency.ticket.flight.routeId,
    originalFlightId: contingency.ticket.flightId,
    seatClass: contingency.ticket.seatClass,
  };
}

/**
 * US-26: vuelos a los que se puede reprogramar un pasaje afectado.
 *
 * - `null` si el token no existe o la contingencia ya fue resuelta.
 * - `[]` si no hay vuelos elegibles.
 * - Solo vuelos de la misma `routeId`, `SCHEDULED`, con `departureAt > now`,
 *   distintos del vuelo original y con cupo en la clase del ticket.
 */
export async function getRebookingAlternatives(
  accessToken: string,
): Promise<RebookingAlternative[] | null> {
  const context = await getPendingRebookingContext(accessToken);
  if (!context) return null;

  const now = new Date();
  const flights = await prisma.flight.findMany({
    where: rebookingCandidateWhere({
      routeId: context.routeId,
      originalFlightId: context.originalFlightId,
      now,
    }),
    orderBy: { departureAt: "asc" },
    select: {
      id: true,
      code: true,
      date: true,
      departureAt: true,
      arrivalAt: true,
      economyCapacity: true,
      economyOccupied: true,
      firstClassCapacity: true,
      firstClassOccupied: true,
    },
  });

  return flights.flatMap((flight) => {
    const seats =
      context.seatClass === "FIRST"
        ? availableSeats(flight.firstClassCapacity, flight.firstClassOccupied)
        : availableSeats(flight.economyCapacity, flight.economyOccupied);

    if (seats <= 0) return [];

    return [
      {
        id: flight.id,
        code: flight.code,
        date: flight.date,
        departureAt: flight.departureAt,
        arrivalAt: flight.arrivalAt,
        availableSeats: seats,
      },
    ];
  });
}
