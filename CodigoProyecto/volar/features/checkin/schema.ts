import { z } from "zod";
import { idSchema } from "@/lib/id";
import { bookingCodeSchema } from "@/features/purchase/schema";

// US-38: pasajeros elegidos para el check-in y la declaración de mercancías
// peligrosas del wireframe (checkin_online.html).
export const checkinSchema = z.object({
  reserva: bookingCodeSchema,
  pasajes: z
    .array(idSchema("Ticket"))
    .min(1, "Elegí al menos un pasajero.")
    .max(9, "Máximo 9 pasajeros por reserva."),
  declaracion: z.literal(true, { error: "Confirmá la declaración de mercancías peligrosas." }),
});

export type CheckinValues = z.input<typeof checkinSchema>;
