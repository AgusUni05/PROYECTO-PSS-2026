import { z } from "zod";
import { idSchema } from "@/lib/id";
import { DATE_REGEX, todayDateString } from "@/lib/dates";

// US-09: capacidad por clase, entero no negativo (mismas reglas al generar y al editar un vuelo).
const capacityField = z
  .number({ error: "Ingresá un número" })
  .int("Debe ser un número entero")
  .min(0, "No puede ser negativo");

// US-11: tarifa por clase, obligatoria y mayor a 0; hasta 2 decimales y dentro
// de lo que admite la columna Decimal(12,2).
const fareField = z
  .number({ error: "Ingresá un número" })
  .positive("Debe ser mayor a 0")
  .multipleOf(0.01, "Máximo 2 decimales")
  .max(9_999_999_999.99, "Monto demasiado alto");

function hasSomeCapacity(data: { economyCapacity: number; firstClassCapacity: number }) {
  return data.economyCapacity > 0 || data.firstClassCapacity > 0;
}

const SOME_CAPACITY_ERROR = {
  message: "Al menos una clase debe tener capacidad",
  path: ["economyCapacity"],
};

// US-04/US-07: generación de vuelos reales a partir de un trayecto y un período.
export const generateFlightsFormSchema = z
  .object({
    routeId: idSchema("Route"),
    startDate: z.string().regex(DATE_REGEX, "Fecha inválida"),
    endDate: z.string().regex(DATE_REGEX, "Fecha inválida"),
    airplaneId: idSchema("Airplane"),
    economyCapacity: capacityField,
    firstClassCapacity: capacityField,
    economyFare: fareField,
    firstClassFare: fareField,
  })
  .refine((data) => data.startDate >= todayDateString(), {
    message: "La fecha de inicio no puede ser anterior a hoy",
    path: ["startDate"],
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "La fecha fin debe ser igual o posterior al inicio",
    path: ["endDate"],
  })
  .refine(hasSomeCapacity, SOME_CAPACITY_ERROR);

export type GenerateFlightsFormValues = z.infer<typeof generateFlightsFormSchema>;

// US-09/US-11: edición puntual de capacidad y tarifas de un vuelo generado. Las
// reglas que dependen del vuelo (no bajar de lo vendido, no superar los
// asientos del avión) las valida el servicio contra la base.
export const editFlightFormSchema = z
  .object({
    economyCapacity: capacityField,
    firstClassCapacity: capacityField,
    economyFare: fareField,
    firstClassFare: fareField,
    airplaneId: idSchema("Airplane").optional(),
    departureTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, "Formato de hora invalido (HH:mm)").optional(),
    arrivalTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, "Formato de hora invalido (HH:mm)").optional(),
  })
  .refine(hasSomeCapacity, SOME_CAPACITY_ERROR)
  .refine((data) => {
    const depChanged = data.departureTime !== undefined;
    const arrChanged = data.arrivalTime !== undefined;
    if ((depChanged && !arrChanged) || (!depChanged && arrChanged)) {
      return false;
    }
    return true;
  }, {
    message: "Debe completar ambos horarios o dejar ambos sin cambios",
    path: ["arrivalTime"],
  });

export type EditFlightFormValues = z.infer<typeof editFlightFormSchema>;

// US-06: motivo operativo de la cancelación, obligatorio (opciones del wireframe
// vuelos_admin.html). Se persiste legible en Flight.cancellationReason y FlightChange.reason.
export const CANCELLATION_REASONS = ["mantenimiento", "meteorologico", "operativo"] as const;
export type CancellationReason = (typeof CANCELLATION_REASONS)[number];
export const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  mantenimiento: "Mantenimiento imprevisto de aeronave",
  meteorologico: "Condiciones meteorológicas adversas",
  operativo: "Reestructuración operativa de itinerarios",
};

const cancellationReasonField = z.enum(CANCELLATION_REASONS, {
  error: "Seleccioná un motivo de cancelación",
});

// US-06: cancelación puntual de un vuelo de una fecha determinada.
export const cancelFlightSchema = z.object({ reason: cancellationReasonField });
export type CancelFlightValues = z.infer<typeof cancelFlightSchema>;

// US-06: cancelación masiva de todos los vuelos programados futuros de un trayecto.
export const cancelRouteFlightsSchema = z.object({
  routeId: idSchema("Route"),
  reason: cancellationReasonField,
});
export type CancelRouteFlightsValues = z.infer<typeof cancelRouteFlightsSchema>;

export const FLIGHT_STATUS_FILTERS = ["SCHEDULED", "COMPLETED", "CANCELLED", "todos"] as const;

export const flightFiltersSchema = z.object({
  fecha: z.string().regex(DATE_REGEX).catch(""),
  origen: z.string().trim().catch(""),
  destino: z.string().trim().catch(""),
  estado: z.enum(FLIGHT_STATUS_FILTERS).catch("SCHEDULED"),
  page: z.coerce.number().int().min(1).catch(1),
});

export type FlightFilters = z.infer<typeof flightFiltersSchema>;
