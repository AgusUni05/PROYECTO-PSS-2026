import { z } from "zod";
import { idSchema } from "@/lib/id";
import { bookingCodeSchema, paymentFormSchema } from "@/features/purchase/schema";

// US-39: cambio voluntario de fecha. Vuelo elegido, aceptación de la política
// de penalidades y los mismos datos de tarjeta que la compra (US-20). No se
// persiste ningún dato sensible de la tarjeta (RNF-08).
export const dateChangeSchema = paymentFormSchema.extend({
  reserva: bookingCodeSchema,
  vuelo: idSchema("Flight"),
  aceptacion: z.literal(true, { error: "Aceptá los términos de la política de penalidades." }),
});

export type DateChangeValues = z.input<typeof dateChangeSchema>;
