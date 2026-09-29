import { z } from "zod";
import { idSchema } from "@/lib/id";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha de hoy en UTC, formato "YYYY-MM-DD" (mismo criterio de fechas que generation.ts). */
function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// US-04/US-07: generación de vuelos reales a partir de un trayecto y un período.
export const generateFlightsFormSchema = z
  .object({
    routeId: idSchema("Route"),
    startDate: z.string().regex(DATE_REGEX, "Fecha inválida"),
    endDate: z.string().regex(DATE_REGEX, "Fecha inválida"),
    airplaneId: idSchema("Airplane"),
    economyCapacity: z
      .number({ error: "Ingresá un número" })
      .int("Debe ser un número entero")
      .min(0, "No puede ser negativo"),
    firstClassCapacity: z
      .number({ error: "Ingresá un número" })
      .int("Debe ser un número entero")
      .min(0, "No puede ser negativo"),
    economyFare: z
      .number({ error: "Ingresá un número" })
      .positive("Debe ser mayor a 0"),
    firstClassFare: z
      .number({ error: "Ingresá un número" })
      .positive("Debe ser mayor a 0"),
  })
  .refine((data) => data.startDate >= todayDateString(), {
    message: "La fecha de inicio no puede ser anterior a hoy",
    path: ["startDate"],
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "La fecha fin debe ser igual o posterior al inicio",
    path: ["endDate"],
  })
  .refine((data) => data.economyCapacity > 0 || data.firstClassCapacity > 0, {
    message: "Al menos una clase debe tener capacidad",
    path: ["economyCapacity"],
  });

export type GenerateFlightsFormValues = z.infer<typeof generateFlightsFormSchema>;

export const FLIGHT_STATUS_FILTERS = ["SCHEDULED", "CANCELLED", "todos"] as const;

export const flightFiltersSchema = z.object({
  fecha: z.string().regex(DATE_REGEX).catch(""),
  origen: z.string().trim().catch(""),
  destino: z.string().trim().catch(""),
  estado: z.enum(FLIGHT_STATUS_FILTERS).catch("SCHEDULED"),
  page: z.coerce.number().int().min(1).catch(1),
});

export type FlightFilters = z.infer<typeof flightFiltersSchema>;
