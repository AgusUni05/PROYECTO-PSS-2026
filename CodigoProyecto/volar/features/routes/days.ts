import { DayOfWeek } from "@/generated/prisma/enums";

// Orden y etiquetas en español para checkboxes y tags de días de operación (US-03).
export const DAY_ORDER: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Lunes",
  TUESDAY: "Martes",
  WEDNESDAY: "Miércoles",
  THURSDAY: "Jueves",
  FRIDAY: "Viernes",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

export const DAY_SHORT_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Lun",
  TUESDAY: "Mar",
  WEDNESDAY: "Mié",
  THURSDAY: "Jue",
  FRIDAY: "Vie",
  SATURDAY: "Sáb",
  SUNDAY: "Dom",
};

/** Formatea una lista de días en el orden de la semana, ej: "Lun, Mié, Vie, Dom". */
export function formatDays(days: DayOfWeek[]): string {
  return DAY_ORDER.filter((d) => days.includes(d))
    .map((d) => DAY_SHORT_LABELS[d])
    .join(", ");
}
