"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { dateChangeSchema, type DateChangeValues } from "./schema";
import { changeBookingDate } from "./service";

/** US-39: cambio voluntario de fecha de una reserva propia. La titularidad sale solo de la sesión. */
export async function changeBookingAction(
  values: DateChangeValues,
): Promise<ActionResult<{ flightCode: string; total: string; transactionId: string }>> {
  const user = await getCurrentUser();
  if (!user || !user.isActive) {
    return { ok: false, error: "Tenés que iniciar sesión para cambiar la reserva." };
  }

  const parsed = dateChangeSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { reserva, vuelo, medioPago, numeroTarjeta, titular, vencimiento, cvv, cuotas } = parsed.data;
  const result = await changeBookingDate(reserva, user.id, vuelo, {
    medioPago,
    numeroTarjeta,
    titular,
    vencimiento,
    cvv,
    cuotas,
  });
  if (result.ok) {
    revalidatePath("/cuenta");
    revalidatePath("/compra/cambiar");
  }
  return result;
}
