import { z } from "zod";
import { DATE_REGEX, todayDateString } from "@/lib/dates";

/** Primer día del mes actual, formato "YYYY-MM-DD" (mismo criterio UTC que lib/dates). */
function firstDayOfCurrentMonth(): string {
  return `${todayDateString().slice(0, 7)}-01`;
}

export const REPORT_CLASS_FILTERS = ["todas", "ECONOMY", "FIRST"] as const;
export type ReportClassFilter = (typeof REPORT_CLASS_FILTERS)[number];

// US-27: filtros de la consulta de ocupación (reportes_admin.html). Por
// defecto, el mes en curso completo, todas las rutas y todas las clases.
export const reportFiltersSchema = z.object({
  desde: z.string().regex(DATE_REGEX).catch(firstDayOfCurrentMonth),
  hasta: z.string().regex(DATE_REGEX).catch(todayDateString),
  ruta: z.string().trim().catch(""),
  clase: z.enum(REPORT_CLASS_FILTERS).catch("todas"),
  page: z.coerce.number().int().min(1).catch(1),
});

export type ReportFilters = z.infer<typeof reportFiltersSchema>;
