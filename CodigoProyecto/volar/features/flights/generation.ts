import type { DayOfWeek } from "@/generated/prisma/enums";
import { isNextDayArrival } from "@/features/routes/time";

const JS_DAY_TO_DAYOFWEEK: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

/**
 * US-04/US-07: fechas (00:00 UTC), entre startDate y endDate ("YYYY-MM-DD",
 * inclusive), cuyo día de la semana está entre los días de operación del trayecto.
 */
export function matchingDates(
  startDate: string,
  endDate: string,
  operatingDays: DayOfWeek[],
): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (cursor <= end) {
    if (operatingDays.includes(JS_DAY_TO_DAYOFWEEK[cursor.getUTCDay()])) {
      dates.push(new Date(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export type FlightWindow = { date: Date; departureAt: Date; arrivalAt: Date };

function combineDateAndTime(date: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const result = new Date(date);
  result.setUTCHours(h, m, 0, 0);
  return result;
}

/**
 * US-04: combina una fecha real con los horarios "HH:mm" del trayecto. La
 * llegada cruza al día siguiente cuando corresponde (reusa isNextDayArrival,
 * la misma regla de US-03).
 */
export function buildFlightWindow(
  date: Date,
  departureTime: string,
  arrivalTime: string,
): FlightWindow {
  const departureAt = combineDateAndTime(date, departureTime);
  const arrivalAt = combineDateAndTime(date, arrivalTime);
  if (isNextDayArrival(departureTime, arrivalTime)) {
    arrivalAt.setUTCDate(arrivalAt.getUTCDate() + 1);
  }
  return { date, departureAt, arrivalAt };
}

/** US-04: true si dos ventanas [departureAt, arrivalAt) se superponen (no cuenta tocarse en el borde). */
export function windowsOverlap(
  a: { departureAt: Date; arrivalAt: Date },
  b: { departureAt: Date; arrivalAt: Date },
): boolean {
  return a.departureAt < b.arrivalAt && b.departureAt < a.arrivalAt;
}
