import { prisma } from "@/lib/prisma";
import type { BookingGetPayload } from "@/generated/prisma/models";
import type { BookingStatus, DocumentType, SeatClass } from "@/generated/prisma/enums";

export type BookingPassenger = {
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
};

export type BookingForPayment = {
  id: string;
  code: string;
  status: BookingStatus;
  seatClass: SeatClass;
  quantity: number;
  unitPrice: string;
  totalAmount: string;
  holdExpiresAt: Date;
  contactName: string;
  contactEmail: string;
  flight: {
    id: string;
    code: string;
    date: Date;
    departureAt: Date;
    arrivalAt: Date;
    airplaneModel: string;
    origin: { code: string; city: string };
    destination: { code: string; city: string };
  };
  passengers: BookingPassenger[];
};

const BOOKING_FOR_PAYMENT_INCLUDE = {
  flight: {
    include: {
      route: {
        select: {
          origin: { select: { code: true, city: true } },
          destination: { select: { code: true, city: true } },
        },
      },
      airplane: { select: { model: true } },
    },
  },
  tickets: {
    orderBy: { createdAt: "asc" },
    select: { firstName: true, lastName: true, documentType: true, documentNumber: true },
  },
} as const;

type BookingRow = BookingGetPayload<{ include: typeof BOOKING_FOR_PAYMENT_INCLUDE }>;

function toBookingForPayment(booking: BookingRow): BookingForPayment {
  return {
    id: booking.id,
    code: booking.code,
    status: booking.status,
    seatClass: booking.seatClass,
    quantity: booking.quantity,
    unitPrice: booking.unitPrice.toString(),
    totalAmount: booking.totalAmount.toString(),
    holdExpiresAt: booking.holdExpiresAt,
    contactName: booking.contactName,
    contactEmail: booking.contactEmail,
    flight: {
      id: booking.flight.id,
      code: booking.flight.code,
      date: booking.flight.date,
      departureAt: booking.flight.departureAt,
      arrivalAt: booking.flight.arrivalAt,
      airplaneModel: booking.flight.airplane.model,
      origin: booking.flight.route.origin,
      destination: booking.flight.route.destination,
    },
    passengers: booking.tickets,
  };
}

/**
 * US-20/US-34: reserva por su código para la pantalla de pago, con el vuelo,
 * el importe y los pasajeros. Devuelve también su estado y el vencimiento de
 * la retención para que la página decida si todavía se puede pagar. `null` si
 * el código no existe.
 */
export async function getBookingForPayment(code: string): Promise<BookingForPayment | null> {
  const booking = await prisma.booking.findUnique({
    where: { code },
    include: BOOKING_FOR_PAYMENT_INCLUDE,
  });
  return booking ? toBookingForPayment(booking) : null;
}

/** US-17: la retención de cupo venció (se libera y hay que reiniciar la compra). */
export function isHoldExpired(holdExpiresAt: Date, now: Date): boolean {
  return holdExpiresAt <= now;
}
