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
