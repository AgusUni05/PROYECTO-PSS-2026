import { z } from "zod";

// US-02: identificador y modelo obligatorios; asientos por clase enteros no
// negativos, con al menos una clase con asientos.
export const airplaneFormSchema = z
  .object({
    identifier: z
      .string()
      .trim()
      .toUpperCase()
      .min(2, "Mínimo 2 caracteres")
      .max(20, "Máximo 20 caracteres")
      .regex(/^[A-Z0-9-]+$/, "Solo letras, números y guiones"),
    model: z.string().trim().min(1, "El modelo es obligatorio").max(80, "Máximo 80 caracteres"),
    economySeats: z
      .number({ error: "Ingresá un número" })
      .int("Debe ser un número entero")
      .min(0, "No puede ser negativo")
      .max(999, "Máximo 999 asientos"),
    firstClassSeats: z
      .number({ error: "Ingresá un número" })
      .int("Debe ser un número entero")
      .min(0, "No puede ser negativo")
      .max(999, "Máximo 999 asientos"),
  })
  .refine((data) => data.economySeats > 0 || data.firstClassSeats > 0, {
    message: "Al menos una clase debe tener asientos",
    path: ["economySeats"],
  });

export type AirplaneFormValues = z.infer<typeof airplaneFormSchema>;

export const AIRPLANE_STATUS_FILTERS = ["activos", "inactivos", "todos"] as const;
export const AIRPLANE_CONFIG_FILTERS = ["todas", "mixto", "economy"] as const;

export const airplaneFiltersSchema = z.object({
  q: z.string().trim().max(120).catch(""),
  estado: z.enum(AIRPLANE_STATUS_FILTERS).catch("activos"),
  config: z.enum(AIRPLANE_CONFIG_FILTERS).catch("todas"),
  page: z.coerce.number().int().min(1).catch(1),
});

export type AirplaneFilters = z.infer<typeof airplaneFiltersSchema>;
