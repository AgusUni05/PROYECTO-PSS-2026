import { z } from "zod";

// US-01: código (IATA/ICAO), nombre y ciudad obligatorios.
export const airportFormSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3,4}$/, "Debe tener 3 (IATA) o 4 (ICAO) letras, sin números ni símbolos"),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120, "Máximo 120 caracteres"),
  city: z.string().trim().min(1, "La ciudad es obligatoria").max(80, "Máximo 80 caracteres"),
});

export type AirportFormValues = z.infer<typeof airportFormSchema>;

export const AIRPORT_STATUS_FILTERS = ["activos", "inactivos", "todos"] as const;

export const airportFiltersSchema = z.object({
  q: z.string().trim().max(120).catch(""),
  estado: z.enum(AIRPORT_STATUS_FILTERS).catch("activos"),
  page: z.coerce.number().int().min(1).catch(1),
});

export type AirportFilters = z.infer<typeof airportFiltersSchema>;
