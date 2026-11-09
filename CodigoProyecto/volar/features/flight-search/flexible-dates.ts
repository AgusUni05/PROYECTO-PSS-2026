import { addDaysToDateString } from "@/lib/dates";
import { buildClassOptions } from "./class-options";
import type { FlightSearchResult } from "./queries";

/** US-42: días antes y después de la fecha buscada que muestra la grilla (±3). */
export const FLEXIBLE_RANGE_DAYS = 3;

export type FlexibleDay = {
  /** "YYYY-MM-DD" */
  date: string;
  /** Desplazamiento respecto de la fecha buscada: -3 … +3 (0 es la buscada). */
  offset: number;
  /**
   * "available": hay vuelos a la venta. "empty": sin vuelos a la venta.
   * "unavailable": fuera del rango buscable (antes de hoy o después del máximo).
   */
  status: "available" | "empty" | "unavailable";
  flightCount: number;
  availableSeats: number;
  /** Tarifa más baja entre las clases con cupo; null si no hay vuelos. */
  minFare: string | null;
  isCheapest: boolean;
};

/** Menor tarifa del vuelo entre sus clases con cupo (una clase agotada no cuenta). */
function lowestFare(flight: FlightSearchResult): number | null {
  const fares = buildClassOptions(flight)
    .filter((option) => option.status !== "sold-out")
    .map((option) => Number(option.fare));
  return fares.length > 0 ? Math.min(...fares) : null;
}

/**
 * US-42: grilla de ±3 días alrededor de `center`. Recibe los vuelos ya
 * filtrados como "a la venta" (isOnSale) y los resume por día. `bounds` es el
 * rango buscable ("YYYY-MM-DD", inclusive): los días fuera quedan "unavailable".
 */
export function buildFlexibleDays(
  center: string,
  flights: FlightSearchResult[],
  bounds: { min: string; max: string },
): FlexibleDay[] {
  const days: FlexibleDay[] = [];

  for (let offset = -FLEXIBLE_RANGE_DAYS; offset <= FLEXIBLE_RANGE_DAYS; offset++) {
    const date = addDaysToDateString(center, offset);
    const inRange = date >= bounds.min && date <= bounds.max;
    const dayFlights = inRange
      ? flights.filter((flight) => flight.date.toISOString().slice(0, 10) === date)
      : [];
    const fares = dayFlights.flatMap((flight) => lowestFare(flight) ?? []);

    days.push({
      date,
      offset,
      status: !inRange ? "unavailable" : dayFlights.length > 0 ? "available" : "empty",
      flightCount: dayFlights.length,
      availableSeats: dayFlights.reduce(
        (sum, flight) => sum + flight.economyAvailable + flight.firstClassAvailable,
        0,
      ),
      minFare: fares.length > 0 ? String(Math.min(...fares)) : null,
      isCheapest: false,
    });
  }

  // "Menor precio" marca todos los días con la tarifa más baja. Si todos los
  // días con vuelos cuestan lo mismo (o hay uno solo), no hay nada que destacar.
  const prices = days.flatMap((day) => (day.minFare === null ? [] : Number(day.minFare)));
  const lowest = Math.min(...prices);
  if (prices.some((price) => price > lowest)) {
    for (const day of days) {
      day.isCheapest = day.minFare !== null && Number(day.minFare) === lowest;
    }
  }

  return days;
}
