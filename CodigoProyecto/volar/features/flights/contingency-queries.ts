import { prisma } from "@/lib/prisma";
import type { SeatClass } from "@/generated/prisma/enums";

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
