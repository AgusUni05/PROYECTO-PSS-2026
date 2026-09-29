import { z } from "zod";
import { DayOfWeek } from "@/generated/prisma/enums";
import { idSchema } from "@/lib/id";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// US-03: origen/destino distintos, al menos un día de operación y ambos horarios.
export const routeFormSchema = z
  .object({
    originId: idSchema("Airport"),
    destinationId: idSchema("Airport"),
    operatingDays: z.array(z.enum(DayOfWeek)).min(1, "Seleccioná al menos un día de operación"),
    departureTime: z.string().regex(TIME_REGEX, "Horario inválido (HH:mm)"),
    arrivalTime: z.string().regex(TIME_REGEX, "Horario inválido (HH:mm)"),
  })
  .refine((data) => data.originId !== data.destinationId, {
    message: "El destino debe ser distinto del origen",
    path: ["destinationId"],
  })
  .refine((data) => data.departureTime !== data.arrivalTime, {
    message: "El horario de llegada debe ser distinto del de partida",
    path: ["arrivalTime"],
  });

export type RouteFormValues = z.infer<typeof routeFormSchema>;

export const ROUTE_STATUS_FILTERS = ["activos", "inactivos", "todos"] as const;

export const routeFiltersSchema = z.object({
  origen: z.string().trim().catch(""),
  destino: z.string().trim().catch(""),
  estado: z.enum(ROUTE_STATUS_FILTERS).catch("activos"),
  page: z.coerce.number().int().min(1).catch(1),
});

export type RouteFilters = z.infer<typeof routeFiltersSchema>;
