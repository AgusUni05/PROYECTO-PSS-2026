import type { BookingStatus } from "@/generated/prisma/enums";
import { changeTier } from "@/features/cancellation/policy";
import {
  voluntaryBlock,
  type CancellableTicket,
  type CancellationBlock,
} from "@/features/cancellation/quote";

/** Cuántos vuelos se ofrecen para el cambio: los más próximos que cumplen las condiciones. */
export const MAX_CHANGE_CANDIDATES = 10;

/** Vuelo de la misma ruta al que se puede cambiar la reserva. */
export type ChangeCandidate = {
  id: string;
  code: string;
  date: Date;
  departureAt: Date;
  arrivalAt: Date;
  /** Tarifa vigente de la clase de los pasajes. */
  fare: string;
  /** Cupo disponible en esa clase. */
  available: number;
  /** Capacidad de esa clase (para tomar el cupo con una actualización condicional). */
  capacity: number;
};

export type ChangeLine = {
  ticketId: string;
  passenger: string;
  paid: string;
  penalty: string;
  difference: string;
  /** Precio del pasaje después del cambio: lo pagado o la tarifa nueva si es mayor. */
  newUnitPrice: string;
};

export type ChangeQuote = {
  code: string;
  blocked: CancellationBlock | null;
  tierLabel: string | null;
  penaltyRate: number | null;
  /** Lo abonado por los pasajes originales. */
  credit: string;
  /** Tarifa del vuelo nuevo por la cantidad de pasajes. */
  newCost: string;
  fareDifference: string;
  penalty: string;
  /** Adicional a abonar: diferencia de tarifa más penalidad. */
  total: string;
  lines: ChangeLine[];
};

const cents = (amount: string) => Math.round(Number(amount) * 100);
const pesos = (value: number) => (value / 100).toFixed(2);

/**
 * US-39: liquidación del cambio voluntario de fecha de la reserva completa al
 * vuelo `candidate` (cambio_cancelacion_pasajero.html). Por pasaje: penalidad
 * sobre lo abonado según la anticipación a su vuelo actual, más la diferencia
 * de tarifa si el vuelo nuevo es más caro (si es más barato no se devuelve).
 */
export function buildChangeQuote(
  booking: { code: string; status: BookingStatus; tickets: CancellableTicket[] },
  candidate: ChangeCandidate,
  now: Date,
): ChangeQuote {
  const blocked = voluntaryBlock(booking, now);
  const fareCents = cents(candidate.fare);
  const lines: ChangeLine[] = [];
  let firstTier: ReturnType<typeof changeTier> = null;

  for (const ticket of booking.tickets) {
    const tier = changeTier(ticket.flight.departureAt, now);
    if (!tier) continue;
    firstTier ??= tier;
    const paidCents = cents(ticket.unitPrice);
    const differenceCents = Math.max(0, fareCents - paidCents);
    lines.push({
      ticketId: ticket.id,
      passenger: `${ticket.lastName}, ${ticket.firstName}`,
      paid: pesos(paidCents),
      penalty: pesos(Math.round(paidCents * tier.retentionRate)),
      difference: pesos(differenceCents),
      newUnitPrice: pesos(paidCents + differenceCents),
    });
  }

  const sum = (field: "paid" | "penalty" | "difference") =>
    lines.reduce((total, line) => total + cents(line[field]), 0);

  return {
    code: booking.code,
    blocked,
    tierLabel: firstTier?.label ?? null,
    penaltyRate: firstTier?.retentionRate ?? null,
    credit: pesos(sum("paid")),
    newCost: pesos(fareCents * lines.length),
    fareDifference: pesos(sum("difference")),
    penalty: pesos(sum("penalty")),
    total: pesos(sum("difference") + sum("penalty")),
    lines,
  };
}
