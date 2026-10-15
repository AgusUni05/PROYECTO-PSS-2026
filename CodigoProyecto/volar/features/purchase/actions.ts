"use server";

import { getCurrentUser } from "@/lib/auth";
import { idSchema } from "@/lib/id";
import type { ActionResult } from "@/lib/action-result";
import { confirmPurchaseSchema, type ConfirmPurchaseValues } from "./schema";
import * as purchaseService from "./service";

/** US-15: confirma cantidad y clase, retiene el cupo y crea la reserva (hold de 10 minutos). */
export async function confirmPurchaseAction(
  values: ConfirmPurchaseValues,
): Promise<ActionResult<{ id: string; code: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Tenés que iniciar sesión para comprar." };

  const parsed = confirmPurchaseSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  return purchaseService.createBooking(
    { flightId: parsed.data.vuelo, seatClass: parsed.data.clase, quantity: parsed.data.cantidad },
    user,
  );
}

/**
 * US-15: vence una reserva puntual (idempotente). La llama el countdown del
 * cliente al llegar a 0 para liberar el cupo apenas se agota el tiempo, sin
 * esperar a que alguien más toque ese vuelo.
 */
export async function expireBookingAction(id: string): Promise<void> {
  if (!idSchema("Booking").safeParse(id).success) return;
  await purchaseService.expireBookingIfDue(id);
}
