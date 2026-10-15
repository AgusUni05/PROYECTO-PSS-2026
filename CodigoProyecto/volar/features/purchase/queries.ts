import { prisma } from "@/lib/prisma";
import type { BookingGetPayload } from "@/generated/prisma/models";
import type {
  BookingStatus,
  DocumentType,
  EmailStatus,
  SeatClass,
} from "@/generated/prisma/enums";

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

export type ComprobanteTicket = {
  id: string;
  number: string | null;
  seat: string | null;
  seatClass: SeatClass;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  issuedAt: Date | null;
};

export type ComprobanteInvoice = {
  id: string;
  number: number;
  customerName: string;
  customerEmail: string;
  totalAmount: string;
  issuedAt: Date;
  items: { description: string; quantity: number; unitPrice: string; amount: string }[];
};

export type PurchaseComprobantes = {
  code: string;
  status: BookingStatus;
  seatClass: SeatClass;
  quantity: number;
  totalAmount: string;
  confirmedAt: Date | null;
  contactEmail: string;
  flight: {
    code: string;
    date: Date;
    departureAt: Date;
    arrivalAt: Date;
    origin: { code: string; city: string };
    destination: { code: string; city: string };
  };
  tickets: ComprobanteTicket[];
  invoice: ComprobanteInvoice | null;
  email: { recipientEmail: string; status: EmailStatus; sentAt: Date | null } | null;
  transactionId: string | null;
};

const BOOKING_FOR_COMPROBANTES_INCLUDE = {
  flight: {
    include: {
      route: {
        select: {
          origin: { select: { code: true, city: true } },
          destination: { select: { code: true, city: true } },
        },
      },
    },
  },
  tickets: {
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
      issuedAt: true,
    },
  },
  invoice: {
    select: {
      id: true,
      number: true,
      customerName: true,
      customerEmail: true,
      totalAmount: true,
      issuedAt: true,
      items: {
        orderBy: { id: "asc" },
        select: { description: true, quantity: true, unitPrice: true, amount: true },
      },
    },
  },
  emails: {
    where: { type: "PURCHASE_CONFIRMATION" },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { status: true, sentAt: true, recipientEmail: true },
  },
  payments: {
    where: { status: "APPROVED" },
    orderBy: { processedAt: "desc" },
    take: 1,
    select: { transactionId: true },
  },
} as const;

type ComprobantesRow = BookingGetPayload<{ include: typeof BOOKING_FOR_COMPROBANTES_INCLUDE }>;

function toPurchaseComprobantes(booking: ComprobantesRow): PurchaseComprobantes {
  const invoice = booking.invoice;

  return {
    code: booking.code,
    status: booking.status,
    seatClass: booking.seatClass,
    quantity: booking.quantity,
    totalAmount: booking.totalAmount.toString(),
    confirmedAt: booking.confirmedAt,
    contactEmail: booking.contactEmail,
    flight: {
      code: booking.flight.code,
      date: booking.flight.date,
      departureAt: booking.flight.departureAt,
      arrivalAt: booking.flight.arrivalAt,
      origin: booking.flight.route.origin,
      destination: booking.flight.route.destination,
    },
    tickets: booking.tickets.map((ticket) => ({
      id: ticket.id,
      number: ticket.number,
      seat: ticket.seat,
      seatClass: ticket.seatClass,
      firstName: ticket.firstName,
      lastName: ticket.lastName,
      documentType: ticket.documentType,
      documentNumber: ticket.documentNumber,
      issuedAt: ticket.issuedAt,
    })),
    invoice: invoice
      ? {
          id: invoice.id,
          number: invoice.number,
          customerName: invoice.customerName,
          customerEmail: invoice.customerEmail,
          totalAmount: invoice.totalAmount.toString(),
          issuedAt: invoice.issuedAt,
          items: invoice.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toString(),
            amount: item.amount.toString(),
          })),
        }
      : null,
    email: booking.emails[0]
      ? {
          recipientEmail: booking.emails[0].recipientEmail,
          status: booking.emails[0].status,
          sentAt: booking.emails[0].sentAt,
        }
      : null,
    transactionId: booking.payments[0]?.transactionId ?? null,
  };
}

/**
 * US-23/US-24: reserva con los comprobantes emitidos (e-tickets, factura y
 * correo) para la pantalla de comprobantes. `null` si el código no existe.
 */
export async function getBookingComprobantes(
  code: string,
): Promise<PurchaseComprobantes | null> {
  const booking = await prisma.booking.findUnique({
    where: { code },
    include: BOOKING_FOR_COMPROBANTES_INCLUDE,
  });
  return booking ? toPurchaseComprobantes(booking) : null;
}
