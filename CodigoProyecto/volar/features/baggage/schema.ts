import { z } from "zod";
import { idSchema } from "@/lib/id";
import { bookingCodeSchema, paymentFormSchema } from "@/features/purchase/schema";
import { MAX_EXTRA_BAGS } from "./pricing";

// US-41: valijas adicionales por pasajero y los mismos datos de tarjeta que la
// compra (US-20). No se persiste ningún dato sensible de la tarjeta (RNF-08).
export const baggageSchema = paymentFormSchema.extend({
  reserva: bookingCodeSchema,
  valijas: z
    .array(
      z.object({
        pasaje: idSchema("Ticket"),
        cantidad: z
          .number()
          .int()
          .min(1, "Elegí al menos una valija.")
          .max(MAX_EXTRA_BAGS, `Máximo ${MAX_EXTRA_BAGS} valijas adicionales por pasajero.`),
      }),
    )
    .min(1, "Elegí al menos una valija.")
    .max(9, "Máximo 9 pasajeros por reserva.")
    .refine(
      (items) => new Set(items.map((item) => item.pasaje)).size === items.length,
      "Cada pasajero puede aparecer una sola vez.",
    ),
});

export type BaggageValues = z.input<typeof baggageSchema>;
