// Formato de fechas, horas y montos de vuelos. Las fechas/horas de vuelo se
// guardan en UTC (mismo criterio que generation.ts), así que se formatean en UTC.

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** Monto en pesos, ej: "$ 45.000". */
export function formatCurrency(amount: number | string): string {
  return currencyFormatter.format(Number(amount));
}

/** Fecha "DD/MM/YYYY". */
export function formatDate(date: Date): string {
  const [y, m, d] = date.toISOString().slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Hora "HH:mm". */
export function formatTime(date: Date): string {
  return date.toISOString().slice(11, 16);
}

const longDateFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Fecha larga, ej: "Viernes 02 de octubre de 2026". */
export function formatLongDate(date: Date): string {
  const text = longDateFormatter.format(date).replace(",", "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
