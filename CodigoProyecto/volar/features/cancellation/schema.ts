import { z } from "zod";
import { bookingCodeSchema } from "@/features/purchase/schema";
import { CANCELLATION_REASONS } from "./policy";

// US-39: cancelación voluntaria con motivo y confirmación de que es
// irreversible (cambio_cancelacion_pasajero.html).
export const voluntaryCancellationSchema = z.object({
  reserva: bookingCodeSchema,
  motivo: z.enum(CANCELLATION_REASONS, { error: "Elegí el motivo de la cancelación." }),
  confirmacion: z.literal(true, {
    error: "Confirmá que entendés que la cancelación es irreversible.",
  }),
});

export type VoluntaryCancellationValues = z.input<typeof voluntaryCancellationSchema>;
