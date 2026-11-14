"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { voluntaryCancellationSchema, type VoluntaryCancellationValues } from "./schema";
import { cancelBookingVoluntarily } from "./service";

/** US-39: cancelación voluntaria de una reserva propia. La titularidad sale solo de la sesión. */
export async function cancelBookingAction(
  values: VoluntaryCancellationValues,
): Promise<ActionResult<{ cancelled: number; penalty: string; refund: string }>> {
  const user = await getCurrentUser();
  if (!user || !user.isActive) {
    return { ok: false, error: "Tenés que iniciar sesión para cancelar la reserva." };
  }

  const parsed = voluntaryCancellationSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const result = await cancelBookingVoluntarily(parsed.data.reserva, user.id, parsed.data.motivo);
  if (result.ok) {
    revalidatePath("/cuenta");
    revalidatePath("/compra/cancelar");
  }
  return result;
}
