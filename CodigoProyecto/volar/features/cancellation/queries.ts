import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { BookingGetPayload } from "@/generated/prisma/models";
import type { BookingStatus } from "@/generated/prisma/enums";
import { buildCancellationQuote, type CancellableTicket, type CancellationQuote } from "./quote";

const CANCELLABLE_BOOKING_SELECT = {
  id: true,
  code: true,
  status: true,
  payments: {
    where: { status: "APPROVED" },
    orderBy: { processedAt: "desc" },
    take: 1,
    select: { cardBrand: true, cardLast4: true, gateway: true },
  },
  tickets: {
    where: { status: "ISSUED" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      unitPrice: true,
      seat: true,
      seatClass: true,
      firstName: true,
      lastName: true,
      contingencies: { where: { resolution: "PENDING" }, select: { id: true }, take: 1 },
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
} satisfies Prisma.BookingSelect;

type CancellableBookingRow = BookingGetPayload<{ select: typeof CANCELLABLE_BOOKING_SELECT }>;

export type CancellableBooking = {
  id: string;
  code: string;
  status: BookingStatus;
  tickets: CancellableTicket[];
  paymentMethod: string;
};

/** Medio por el que se acredita el reintegro: la tarjeta original o el cobro de mostrador. */
function paymentMethodLabel(payment: CancellableBookingRow["payments"][number] | undefined): string {
  if (payment?.cardBrand && payment.cardLast4) return `${payment.cardBrand} •••• ${payment.cardLast4}`;
  return payment?.gateway ?? "Medio de pago original";
}

/**
 * US-39: reserva propia con sus pasajes emitidos, lista para liquidar la
 * cancelación. `buyerId` sale siempre de la sesión: una reserva ajena y una
 * inexistente devuelven null.
 */
export async function loadCancellableBooking(
  code: string,
  buyerId: string,
): Promise<CancellableBooking | null> {
  const booking = await prisma.booking.findFirst({
    where: { code, buyerId },
    select: CANCELLABLE_BOOKING_SELECT,
  });
  if (!booking) return null;

  return {
    id: booking.id,
    code: booking.code,
    status: booking.status,
    paymentMethod: paymentMethodLabel(booking.payments[0]),
    tickets: booking.tickets.map((ticket) => ({
      id: ticket.id,
      unitPrice: ticket.unitPrice.toString(),
      seat: ticket.seat,
      seatClass: ticket.seatClass,
      firstName: ticket.firstName,
      lastName: ticket.lastName,
      hasPendingContingency: ticket.contingencies.length > 0,
      flight: {
        id: ticket.flight.id,
        code: ticket.flight.code,
        date: ticket.flight.date,
        departureAt: ticket.flight.departureAt,
        status: ticket.flight.status,
        origin: ticket.flight.route.origin,
        destination: ticket.flight.route.destination,
      },
    })),
  };
}

/** US-39: liquidación para la pantalla de cancelación; null si la reserva no es del comprador. */
export async function getCancellationQuote(
  code: string,
  buyerId: string,
  now: Date = new Date(),
): Promise<CancellationQuote | null> {
  const booking = await loadCancellableBooking(code, buyerId);
  return booking ? buildCancellationQuote(booking, now) : null;
}
