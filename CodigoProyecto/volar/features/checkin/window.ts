// US-38: ventana de check-in online (checkin_online.html). Usa `departureAt`
// con el mismo criterio que el resto de la app para "el vuelo ya salió".

/** El check-in abre estas horas antes de la salida. */
export const CHECKIN_OPENS_HOURS_BEFORE = 24;

/** El embarque (y el cierre del check-in) es estos minutos antes de la salida. */
export const BOARDING_MINUTES_BEFORE = 40;

export type CheckinWindowState = "not-open" | "open" | "closed";

export function checkinOpensAt(departureAt: Date): Date {
  return new Date(departureAt.getTime() - CHECKIN_OPENS_HOURS_BEFORE * 60 * 60_000);
}

/** Hora de embarque impresa en la tarjeta; el check-in cierra a esta hora. */
export function boardingTime(departureAt: Date): Date {
  return new Date(departureAt.getTime() - BOARDING_MINUTES_BEFORE * 60_000);
}

/**
 * Salidas con el check-in abierto en `now`, para filtrar en la base al
 * escribir (misma regla que checkinWindowState, despejada para departureAt).
 */
export function openCheckinDepartureRange(now: Date): { gt: Date; lte: Date } {
  return {
    gt: new Date(now.getTime() + BOARDING_MINUTES_BEFORE * 60_000),
    lte: new Date(now.getTime() + CHECKIN_OPENS_HOURS_BEFORE * 60 * 60_000),
  };
}

/** Abierta desde 24 h antes de la salida (inclusive) hasta la hora de embarque (exclusive). */
export function checkinWindowState(departureAt: Date, now: Date): CheckinWindowState {
  if (now < checkinOpensAt(departureAt)) return "not-open";
  if (now < boardingTime(departureAt)) return "open";
  return "closed";
}
