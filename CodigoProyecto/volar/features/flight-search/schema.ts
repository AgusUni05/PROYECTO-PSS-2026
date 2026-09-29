import { z } from "zod";
import { idSchema } from "@/lib/id";
import { DATE_REGEX, todayDateString } from "@/lib/dates";

// Los checks de campo cortan (abort) para que, con un campo vacío o inválido,
// no se sumen los refine de abajo: un solo motivo por campo para el pasajero.
function airportField(requiredMessage: string) {
  return z
    .string({ error: requiredMessage })
    .min(1, { error: requiredMessage, abort: true })
    .pipe(idSchema("Airport"));
}

// US-13: búsqueda de vuelos por origen, destino y fecha. Lo usan el formulario
// (cliente) y la página de resultados (searchParams, servidor).
export const flightSearchSchema = z
  .object({
    origen: airportField("Seleccioná el origen"),
    destino: airportField("Seleccioná el destino"),
    fecha: z
      .string({ error: "Elegí la fecha de salida" })
      .regex(DATE_REGEX, { error: "Elegí la fecha de salida", abort: true }),
  })
  .refine((data) => data.origen !== data.destino, {
    message: "El destino debe ser distinto del origen",
    path: ["destino"],
  })
  .refine((data) => data.fecha >= todayDateString(), {
    message: "La fecha de salida no puede ser anterior a hoy",
    path: ["fecha"],
  });

export type FlightSearchValues = z.infer<typeof flightSearchSchema>;
