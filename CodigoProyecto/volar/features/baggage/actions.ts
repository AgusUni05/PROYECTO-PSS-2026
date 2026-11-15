"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { baggageSchema, type BaggageValues } from "./schema";
import { addExtraBaggage } from "./service";

/** US-41: compra de valijas adicionales en el check-in. La titularidad sale solo de la sesión. */
export async function addBaggageAction(
  values: BaggageValues,
): Promise<ActionResult<{ bags: number; total: number; transactionId: string }>> {
  const user = await getCurrentUser();
  if (!user || !user.isActive) {
    return { ok: false, error: "Tenés que iniciar sesión para agregar equipaje." };
  }

  const parsed = baggageSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { reserva, valijas, medioPago, numeroTarjeta, titular, vencimiento, cvv, cuotas } = parsed.data;
  const result = await addExtraBaggage(
    reserva,
    user.id,
    valijas.map((item) => ({ ticketId: item.pasaje, bags: item.cantidad })),
    { medioPago, numeroTarjeta, titular, vencimiento, cvv, cuotas },
  );
  if (result.ok) {
    revalidatePath("/compra/checkin");
    revalidatePath("/cuenta");
  }
  return result;
}
