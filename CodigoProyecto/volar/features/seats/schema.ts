import { z } from "zod";
import { idSchema } from "@/lib/id";
import { bookingCodeSchema } from "@/features/purchase/schema";

// US-37: asiento elegido para cada pasajero de un vuelo de la reserva.
export const seatSelectionSchema = z.object({
  reserva: bookingCodeSchema,
  vuelo: idSchema("Flight"),
  asientos: z
    .array(
      z.object({
        pasaje: idSchema("Ticket"),
        asiento: z.string().regex(/^[0-9]{1,3}[A-F]$/, "Asiento inválido."),
      }),
    )
    .min(1, "Elegí al menos un asiento.")
    .max(9, "Máximo 9 pasajeros por reserva."),
});

export type SeatSelectionValues = z.input<typeof seatSelectionSchema>;
