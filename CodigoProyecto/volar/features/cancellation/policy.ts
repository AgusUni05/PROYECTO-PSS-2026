// US-39: política de penalidades por cancelación voluntaria
// (cambio_cancelacion_pasajero.html, cuadro tarifario RFO-03). Usa
// `departureAt` con el mismo criterio que el resto de la app para "ya salió".

export const CANCELLATION_REASONS = ["imprevisto", "cambio-fechas", "medicas"] as const;
export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

export const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  imprevisto: "Imprevisto personal o laboral",
  "cambio-fechas": "Cambio de fechas de vacaciones o estadía",
  medicas: "Razones médicas del grupo familiar",
};

export type CancellationTier = {
  label: string;
  /** Porción del precio pagado que se retiene (0.2 = 20 %). */
  retentionRate: number;
};

const HOUR = 3600_000;

/** Cuadro tarifario del wireframe, de mayor a menor anticipación. */
export const CANCELLATION_POLICY: readonly CancellationTier[] = [
  { label: "Más de 48 horas antes", retentionRate: 0.2 },
  { label: "Entre 24 y 48 horas antes", retentionRate: 0.35 },
  { label: "Menos de 24 horas antes", retentionRate: 0.5 },
];

/**
 * Cambio voluntario de fecha: mismos tramos que la cancelación, con penalidad
 * de 15 %, 25 % y 35 % sobre lo abonado, más la diferencia de tarifa.
 */
export const CHANGE_POLICY: readonly CancellationTier[] = [
  { label: "Más de 48 horas antes", retentionRate: 0.15 },
  { label: "Entre 24 y 48 horas antes", retentionRate: 0.25 },
  { label: "Menos de 24 horas antes", retentionRate: 0.35 },
];

/** Índice del tramo (0: más de 48 h, 1: entre 24 y 48 h inclusive, 2: menos de 24 h); null si ya salió. */
function anticipationTier(departureAt: Date, now: Date): 0 | 1 | 2 | null {
  const remaining = departureAt.getTime() - now.getTime();
  if (remaining <= 0) return null;
  if (remaining > 48 * HOUR) return 0;
  if (remaining >= 24 * HOUR) return 1;
  return 2;
}

/**
 * Tramo según la anticipación a la salida: más de 48 h retiene 20 %, entre 24
 * y 48 h (inclusive) 35 %, menos de 24 h 50 %. Null si el vuelo ya salió.
 */
export function cancellationTier(departureAt: Date, now: Date): CancellationTier | null {
  const tier = anticipationTier(departureAt, now);
  return tier === null ? null : CANCELLATION_POLICY[tier];
}

/** Tramo de penalidad del cambio voluntario de fecha (`retentionRate` es la penalidad). */
export function changeTier(departureAt: Date, now: Date): CancellationTier | null {
  const tier = anticipationTier(departureAt, now);
  return tier === null ? null : CHANGE_POLICY[tier];
}

/** "20 %" a partir de 0.2. */
export function formatRetention(rate: number): string {
  return `${Math.round(rate * 100)} %`;
}

/**
 * Retención y reintegro de un pasaje, en pesos con 2 decimales. Se calcula en
 * centavos: la retención se redondea y el reintegro es exactamente el resto.
 */
export function voluntaryRefundAmounts(
  unitPrice: string,
  retentionRate: number,
): { penalty: string; refund: string } {
  const paidCents = Math.round(Number(unitPrice) * 100);
  const penaltyCents = Math.round(paidCents * retentionRate);
  const toPesos = (cents: number) => (cents / 100).toFixed(2);
  return { penalty: toPesos(penaltyCents), refund: toPesos(paidCents - penaltyCents) };
}
