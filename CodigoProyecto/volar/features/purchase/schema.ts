import { z } from "zod";
import { SeatClass } from "@/generated/prisma/enums";
import { idSchema } from "@/lib/id";

// US-14: selección con la que se inicia la compra desde un resultado de
// búsqueda (/compra?vuelo=…&clase=…). Viene por URL, así que se valida siempre.
export const purchaseSelectionSchema = z.object({
  vuelo: idSchema("Flight"),
  clase: z.enum(SeatClass, { error: "Clase inválida" }),
});

export type PurchaseSelection = z.infer<typeof purchaseSelectionSchema>;

// US-15: cantidad de pasajes a confirmar sobre la selección anterior (misma
// clase para todo el grupo). 1 a 9 pasajes por transacción.
export const confirmPurchaseSchema = purchaseSelectionSchema.extend({
  cantidad: z.coerce
    .number({ error: "Cantidad inválida" })
    .int("La cantidad debe ser un número entero")
    .min(1, "Mínimo 1 pasaje")
    .max(9, "Máximo 9 pasajes por transacción"),
});

export type ConfirmPurchaseValues = z.infer<typeof confirmPurchaseSchema>;
