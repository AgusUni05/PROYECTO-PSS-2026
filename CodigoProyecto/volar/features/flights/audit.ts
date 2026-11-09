import { formatCurrency, formatDate, formatTime } from "./format";

// US-43: auditoría de vuelos. Cada evento guarda los valores modificados como
// [{ field, from, to }] para poder explicar un cambio ante un reclamo.

export const AUDIT_FIELD_LABELS = {
  departureAt: "Partida",
  arrivalAt: "Llegada",
  airplane: "Avión",
  economyCapacity: "Capacidad Economy",
  firstClassCapacity: "Capacidad Primera",
  economyFare: "Tarifa Economy",
  firstClassFare: "Tarifa Primera",
  status: "Estado",
} as const;

export type FlightAuditField = keyof typeof AUDIT_FIELD_LABELS;

const AUDIT_FIELDS = Object.keys(AUDIT_FIELD_LABELS) as FlightAuditField[];

type FlightStatusValue = "SCHEDULED" | "COMPLETED" | "CANCELLED";

const STATUS_LABELS: Record<FlightStatusValue, string> = {
  SCHEDULED: "Programado",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

export const AUDIT_ACTION_LABELS = {
  CREATED: "Creación",
  UPDATED: "Modificación",
  CANCELLED: "Cancelación",
} as const;

export type FlightAuditAction = keyof typeof AUDIT_ACTION_LABELS;

export type FlightAuditValue = string | number | null;

export type FlightAuditChange = {
  field: FlightAuditField;
  from: FlightAuditValue;
  to: FlightAuditValue;
};

/** Estado auditable de un vuelo. `airplane` es la matrícula, legible sin joins. */
export type FlightAuditSnapshot = {
  departureAt: Date;
  arrivalAt: Date;
  airplane: string;
  economyCapacity: number;
  firstClassCapacity: number;
  economyFare: number;
  firstClassFare: number;
  status: FlightStatusValue;
};

function serialize(snapshot: FlightAuditSnapshot): Record<FlightAuditField, string | number> {
  return {
    ...snapshot,
    departureAt: snapshot.departureAt.toISOString(),
    arrivalAt: snapshot.arrivalAt.toISOString(),
  };
}

/**
 * Campos que cambian entre `before` y `after`. Sin `before` (creación), lista
 * todos los valores iniciales con `from: null`.
 */
export function auditChanges(
  before: FlightAuditSnapshot | null,
  after: FlightAuditSnapshot,
): FlightAuditChange[] {
  const to = serialize(after);
  const from = before ? serialize(before) : null;
  return AUDIT_FIELDS.filter((field) => !from || from[field] !== to[field]).map((field) => ({
    field,
    from: from ? from[field] : null,
    to: to[field],
  }));
}

/** Valor de un campo auditado, formateado como en el resto del panel. */
export function formatAuditValue(field: FlightAuditField, value: FlightAuditValue): string {
  if (value === null) return "—";
  switch (field) {
    case "departureAt":
    case "arrivalAt": {
      const date = new Date(value);
      return `${formatDate(date)} ${formatTime(date)}`;
    }
    case "economyFare":
    case "firstClassFare":
      return formatCurrency(value);
    case "status":
      return STATUS_LABELS[value as FlightStatusValue] ?? String(value);
    default:
      return String(value);
  }
}

const timestampFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "America/Argentina/Buenos_Aires",
});

/**
 * Momento real del evento en hora argentina, ej: "09/11/2026, 14:05:32".
 * A diferencia de los horarios de vuelo (que se guardan como hora local en UTC),
 * createdAt es un instante real.
 */
export function formatAuditTimestamp(date: Date): string {
  return timestampFormatter.format(date);
}
