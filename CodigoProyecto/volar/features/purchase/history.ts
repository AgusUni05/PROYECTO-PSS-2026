import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { BookingGetPayload } from "@/generated/prisma/models";
import type {
  BookingStatus,
  DocumentType,
  FlightChangeType,
  FlightStatus,
  SeatClass,
  TicketStatus,
} from "@/generated/prisma/enums";

export type PurchaseHistoryFlight = {
  id: string;
  code: string;
  date: Date;
  departureAt: Date;
  arrivalAt: Date;
  status: FlightStatus;
  origin: { code: string; city: string };
  destination: { code: string; city: string };
};

export type PurchaseHistoryTicket = {
  id: string;
  number: string | null;
  seat: string | null;
  seatClass: SeatClass;
  status: TicketStatus;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  issuedAt: Date | null;
  flight: PurchaseHistoryFlight;
};

export type PendingPurchaseContingency = {
  ticketId: string;
  accessToken: string;
  type: FlightChangeType;
  previousDepartureAt: Date;
  previousArrivalAt: Date;
  newDepartureAt: Date | null;
  newArrivalAt: Date | null;
  reason: string | null;
};

export type PurchaseHistoryEntry = {
  id: string;
  code: string;
  status: BookingStatus;
  createdAt: Date;
  confirmedAt: Date | null;
  totalAmount: string;
  quantity: number;
  seatClass: SeatClass;
  tickets: PurchaseHistoryTicket[];
  invoice: { id: string; number: number; issuedAt: Date } | null;
  pendingContingencies: PendingPurchaseContingency[];
};

export type PurchaseHistory = {
  upcoming: PurchaseHistoryEntry[];
  past: PurchaseHistoryEntry[];
};

/**
 * US-35: selección explícita para "Mis Compras". Deja fuera pagos, datos de
 * tarjeta, comprador, vendedor y correo de contacto (RNF-08).
 */
const PURCHASE_HISTORY_SELECT = {
  id: true,
  code: true,
  status: true,
  createdAt: true,
  confirmedAt: true,
  totalAmount: true,
  quantity: true,
  seatClass: true,
  invoice: { select: { id: true, number: true, issuedAt: true } },
  tickets: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      number: true,
      seat: true,
      seatClass: true,
      status: true,
      firstName: true,
      lastName: true,
      documentType: true,
      documentNumber: true,
      issuedAt: true,
      // US-26: el pasaje puede estar reprogramado en un vuelo distinto al de
      // la compra, así que el vuelo vigente siempre sale del ticket.
      flight: {
        select: {
          id: true,
          code: true,
          date: true,
          departureAt: true,
          arrivalAt: true,
          status: true,
          route: {
            select: {
              origin: { select: { code: true, city: true } },
              destination: { select: { code: true, city: true } },
            },
          },
        },
      },
      contingencies: {
        where: { resolution: "PENDING" },
        orderBy: { createdAt: "asc" },
        select: {
          ticketId: true,
          accessToken: true,
          flightChange: {
            select: {
              type: true,
              previousDepartureAt: true,
              previousArrivalAt: true,
              newDepartureAt: true,
              newArrivalAt: true,
              reason: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.BookingSelect;

type PurchaseHistoryRow = BookingGetPayload<{ select: typeof PURCHASE_HISTORY_SELECT }>;
type PurchaseHistoryFlightRow = PurchaseHistoryRow["tickets"][number]["flight"];

function toPurchaseHistoryFlight(flight: PurchaseHistoryFlightRow): PurchaseHistoryFlight {
  return {
    id: flight.id,
    code: flight.code,
    date: flight.date,
    departureAt: flight.departureAt,
    arrivalAt: flight.arrivalAt,
    status: flight.status,
    origin: { code: flight.route.origin.code, city: flight.route.origin.city },
    destination: {
      code: flight.route.destination.code,
      city: flight.route.destination.city,
    },
  };
}

function toPurchaseHistoryEntry(booking: PurchaseHistoryRow): PurchaseHistoryEntry {
  return {
    id: booking.id,
    code: booking.code,
    status: booking.status,
    createdAt: booking.createdAt,
    confirmedAt: booking.confirmedAt,
    totalAmount: booking.totalAmount.toString(),
    quantity: booking.quantity,
    seatClass: booking.seatClass,
    tickets: booking.tickets.map((ticket) => ({
      id: ticket.id,
      number: ticket.number,
      seat: ticket.seat,
      seatClass: ticket.seatClass,
      status: ticket.status,
      firstName: ticket.firstName,
      lastName: ticket.lastName,
      documentType: ticket.documentType,
      documentNumber: ticket.documentNumber,
      issuedAt: ticket.issuedAt,
      flight: toPurchaseHistoryFlight(ticket.flight),
    })),
    invoice: booking.invoice
      ? {
          id: booking.invoice.id,
          number: booking.invoice.number,
          issuedAt: booking.invoice.issuedAt,
        }
      : null,
    pendingContingencies: booking.tickets.flatMap((ticket) =>
      ticket.contingencies.map((contingency) => ({
        ticketId: contingency.ticketId,
        accessToken: contingency.accessToken,
        type: contingency.flightChange.type,
        previousDepartureAt: contingency.flightChange.previousDepartureAt,
        previousArrivalAt: contingency.flightChange.previousArrivalAt,
        newDepartureAt: contingency.flightChange.newDepartureAt,
        newArrivalAt: contingency.flightChange.newArrivalAt,
        reason: contingency.flightChange.reason,
      })),
    ),
  };
}

/**
 * US-35: una compra es "próxima" cuando sigue confirmada y tiene un pasaje
 * emitido por salir, o cuando conserva una contingencia pendiente. Lo segundo
 * evita ocultar una acción urgente aunque la fecha del vuelo ya haya pasado.
 * Las compras canceladas siempre son historial: su cupo ya fue reembolsado.
 */
function isUpcoming(entry: PurchaseHistoryEntry, now: Date): boolean {
  if (entry.status !== "CONFIRMED") return false;
  if (entry.pendingContingencies.length > 0) return true;
  return entry.tickets.some(
    (ticket) => ticket.status === "ISSUED" && ticket.flight.departureAt >= now,
  );
}

/** Menor salida futura entre los pasajes emitidos (clave de orden de próximas). */
function nextDepartureKey(entry: PurchaseHistoryEntry, now: Date): number | null {
  const departures = entry.tickets
    .filter((ticket) => ticket.status === "ISSUED" && ticket.flight.departureAt >= now)
    .map((ticket) => ticket.flight.departureAt.getTime());
  return departures.length > 0 ? Math.min(...departures) : null;
}

/** Mayor salida entre todos los pasajes de la compra (clave de orden de pasadas). */
function lastDepartureKey(entry: PurchaseHistoryEntry): number | null {
  if (entry.tickets.length === 0) return null;
  return Math.max(...entry.tickets.map((ticket) => ticket.flight.departureAt.getTime()));
}

function sortUpcoming(entries: PurchaseHistoryEntry[], now: Date): PurchaseHistoryEntry[] {
  return entries.sort((a, b) => {
    const aKey = nextDepartureKey(a, now);
    const bKey = nextDepartureKey(b, now);
    if (aKey !== null && bKey !== null) return aKey - bKey;
    if (aKey !== null) return -1;
    if (bKey !== null) return 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

function sortPast(entries: PurchaseHistoryEntry[]): PurchaseHistoryEntry[] {
  return entries.sort((a, b) => {
    const aKey = lastDepartureKey(a);
    const bKey = lastDepartureKey(b);
    if (aKey !== null && bKey !== null) return bKey - aKey;
    if (aKey !== null) return -1;
    if (bKey !== null) return 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

/**
 * US-35: historial de compras de una cuenta. El `userId` es siempre el del
 * guardia server-side (`requirePassenger`), nunca un dato del cliente.
 *
 * Devuelve las compras confirmadas y canceladas del comprador separadas en
 * próximas y pasadas, con el vuelo vigente de cada pasaje, la factura y las
 * contingencias pendientes que requieren una acción.
 */
export async function getPurchaseHistoryForUser(
  userId: string,
  now: Date = new Date(),
): Promise<PurchaseHistory> {
  const where: Prisma.BookingWhereInput = {
    buyerId: userId,
    status: { in: ["CONFIRMED", "CANCELLED"] },
  };

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: PURCHASE_HISTORY_SELECT,
  });

  const entries = bookings.map(toPurchaseHistoryEntry);

  return {
    upcoming: sortUpcoming(
      entries.filter((entry) => isUpcoming(entry, now)),
      now,
    ),
    past: sortPast(entries.filter((entry) => !isUpcoming(entry, now))),
  };
}
