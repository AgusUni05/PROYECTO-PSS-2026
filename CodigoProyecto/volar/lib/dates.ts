// Fechas de calendario como string "YYYY-MM-DD", interpretadas en UTC (mismo
// criterio que la generación de vuelos: features/flights/generation.ts).

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha de hoy en UTC, formato "YYYY-MM-DD". */
export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" → Date a las 00:00 UTC (como se guardan las columnas @db.Date). */
export function parseDateString(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}
