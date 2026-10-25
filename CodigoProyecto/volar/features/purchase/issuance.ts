import { newId } from "@/lib/id";
import type { Prisma, Booking, Ticket } from "@/generated/prisma/client";
import type { SeatClass } from "@/generated/prisma/enums";
import { SEAT_CLASS_LABELS } from "@/features/flight-search/class-options";

// US-23: asientos por fila según la clase (6 en Economy, 4 en Primera). El
// asiento se numera fila+letra, ej: "14A".
const SEAT_LETTERS: Record<SeatClass, string[]> = {
  ECONOMY: ["A", "B", "C", "D", "E", "F"],
  FIRST: ["A", "B", "C", "D"],
};

export type BookingToIssue = Pick<
  Booking,
  "id" | "code" | "flightId" | "seatClass" | "contactName" | "contactEmail" | "totalAmount"
> & {
  flight: { code: string; economyCapacity: number; firstClassCapacity: number };
  tickets: Pick<Ticket, "id" | "firstName" | "lastName" | "unitPrice">[];
};

/** Letras de asiento disponibles en la clase (US-26 las reutiliza al reprogramar). */
export function seatLetters(seatClass: SeatClass): string[] {
  return SEAT_LETTERS[seatClass];
}

/** Cantidad de filas necesarias para acomodar `capacity` asientos de la clase. */
export function seatRows(seatClass: SeatClass, capacity: number): number {
  return Math.max(1, Math.ceil(capacity / SEAT_LETTERS[seatClass].length));
}

/**
 * US-23: reparte `quantity` asientos libres del vuelo en orden de fila y letra.
 * `taken` son los asientos que ya ocupan pasajes emitidos del mismo vuelo y
 * clase. Si no alcanzan, se devuelve lo que se pudo asignar.
 */
export function assignSeats(
  taken: string[],
  quantity: number,
  rows: number,
  letters: string[],
): string[] {
  const occupied = new Set(taken);
  const seats: string[] = [];
  for (let row = 1; row <= rows && seats.length < quantity; row++) {
    for (const letter of letters) {
      const seat = `${row}${letter}`;
      if (occupied.has(seat)) continue;
      occupied.add(seat);
      seats.push(seat);
      if (seats.length === quantity) break;
    }
  }
  return seats;
}

/**
 * Número de e-ticket, único porque el código de reserva lo es. `suffix` permite
 * reemisiones deterministas (US-26) sin chocar con el número original.
 */
export function ticketNumber(bookingCode: string, index: number, suffix?: string): string {
  const base = `ETK-${bookingCode}-${index + 1}`;
  return suffix ? `${base}-${suffix}` : base;
}

/**
 * US-23/US-24: emite los comprobantes de una compra confirmada. Un e-ticket por
 * pasajero (con número y asiento), la factura de venta con su desglose y el
 * correo de comprobantes. Se ejecuta dentro de la transacción del pago, así que
 * falla entero si algo no se puede emitir.
 */
export async function issueComprobantes(
  tx: Prisma.TransactionClient,
  booking: BookingToIssue,
  now: Date,
): Promise<void> {
  const capacity =
    booking.seatClass === "ECONOMY"
      ? booking.flight.economyCapacity
      : booking.flight.firstClassCapacity;

  const taken = await tx.ticket.findMany({
    where: { flightId: booking.flightId, seatClass: booking.seatClass, seat: { not: null } },
    select: { seat: true },
    distinct: ["seat"],
  });

  const seats = assignSeats(
    taken.flatMap((row) => row.seat ?? []),
    booking.tickets.length,
    seatRows(booking.seatClass, capacity),
    SEAT_LETTERS[booking.seatClass],
  );
  if (seats.length < booking.tickets.length) throw new Error("NO_SEATS");

  for (const [index, ticket] of booking.tickets.entries()) {
    await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        number: ticketNumber(booking.code, index),
        seat: seats[index],
        issuedAt: now,
        status: "ISSUED",
      },
    });
  }

  await tx.invoice.create({
    data: {
      id: newId("Invoice"),
      bookingId: booking.id,
      customerName: booking.contactName,
      customerEmail: booking.contactEmail,
      customerTaxId: null,
      totalAmount: booking.totalAmount,
      items: {
        create: booking.tickets.map((ticket, index) => ({
          id: newId("InvoiceItem"),
          description: `Pasaje ${SEAT_CLASS_LABELS[booking.seatClass]} ${booking.flight.code} - ${ticket.lastName}, ${ticket.firstName} (asiento ${seats[index]})`,
          quantity: 1,
          unitPrice: ticket.unitPrice,
          amount: ticket.unitPrice,
        })),
      },
    },
  });

  await sendPurchaseEmail(tx, booking);
}

/**
 * US-24/RNF-02: deja la confirmación de compra en el outbox. El envío real
 * (con los PDFs adjuntos) ocurre fuera de esta transacción, justo después de
 * aprobar el pago, o al reintentar con `pnpm mail:send`.
 */
async function sendPurchaseEmail(
  tx: Prisma.TransactionClient,
  booking: BookingToIssue,
): Promise<void> {
  // US-33: una venta de mostrador puede no tener email de contacto; sin
  // destinatario no hay nada para encolar (no es un error, es opcional).
  if (!booking.contactEmail) return;

  await tx.emailNotification.create({
    data: {
      id: newId("EmailNotification"),
      type: "PURCHASE_CONFIRMATION",
      recipientEmail: booking.contactEmail,
      subject: `Tus pasajes y factura - reserva ${booking.code}`,
      bookingId: booking.id,
      status: "PENDING",
      attempts: 0,
      sentAt: null,
    },
  });
}
