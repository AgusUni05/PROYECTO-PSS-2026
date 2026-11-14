import type { BookingStatus, FlightStatus, SeatClass } from "@/generated/prisma/enums";
import { cancellationTier, voluntaryRefundAmounts } from "./policy";

export type CancellableTicket = {
  id: string;
  unitPrice: string;
  seat: string | null;
  seatClass: SeatClass;
  firstName: string;
  lastName: string;
  hasPendingContingency: boolean;
  flight: {
    id: string;
    code: string;
    date: Date;
    departureAt: Date;
    status: FlightStatus;
    origin: { code: string; city: string };
    destination: { code: string; city: string };
  };
};

/** Motivo por el que la reserva no se puede cancelar voluntariamente. */
export type CancellationBlock = "not-confirmed" | "no-tickets" | "contingency" | "departed";

export type CancellationLine = {
  ticketId: string;
  passenger: string;
  seat: string | null;
  seatClass: SeatClass;
  flight: CancellableTicket["flight"];
  tierLabel: string;
  retentionRate: number;
  paid: string;
  penalty: string;
  refund: string;
};

export type CancellationQuote = {
  code: string;
  blocked: CancellationBlock | null;
  lines: CancellationLine[];
  totals: { paid: string; penalty: string; refund: string };
  paymentMethod: string;
};

const cents = (amount: string) => Math.round(Number(amount) * 100);
const pesos = (value: number) => (value / 100).toFixed(2);

/**
 * US-39: liquidación de la cancelación voluntaria de la reserva completa (sus
 * pasajes emitidos). La usan la pantalla y el servicio, así no discrepan.
 * Cada pasaje se liquida con el tramo de su vuelo actual (US-26 puede haberlo
 * reprogramado a otro vuelo).
 */
export function buildCancellationQuote(
  booking: {
    code: string;
    status: BookingStatus;
    tickets: CancellableTicket[];
    paymentMethod: string;
  },
  now: Date,
): CancellationQuote {
  const lines: CancellationLine[] = [];
  let departed = false;

  for (const ticket of booking.tickets) {
    const tier =
      ticket.flight.status === "SCHEDULED" ? cancellationTier(ticket.flight.departureAt, now) : null;
    if (!tier) {
      departed = true;
      continue;
    }
    const { penalty, refund } = voluntaryRefundAmounts(ticket.unitPrice, tier.retentionRate);
    lines.push({
      ticketId: ticket.id,
      passenger: `${ticket.lastName}, ${ticket.firstName}`,
      seat: ticket.seat,
      seatClass: ticket.seatClass,
      flight: ticket.flight,
      tierLabel: tier.label,
      retentionRate: tier.retentionRate,
      paid: pesos(cents(ticket.unitPrice)),
      penalty,
      refund,
    });
  }

  const blocked: CancellationBlock | null =
    booking.status !== "CONFIRMED"
      ? "not-confirmed"
      : booking.tickets.length === 0
        ? "no-tickets"
        : booking.tickets.some((ticket) => ticket.hasPendingContingency)
          ? "contingency"
          : departed
            ? "departed"
            : null;

  const sum = (field: "paid" | "penalty" | "refund") =>
    pesos(lines.reduce((total, line) => total + cents(line[field]), 0));

  return {
    code: booking.code,
    blocked,
    lines,
    totals: { paid: sum("paid"), penalty: sum("penalty"), refund: sum("refund") },
    paymentMethod: booking.paymentMethod,
  };
}
