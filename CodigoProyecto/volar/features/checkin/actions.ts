"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { checkinSchema, type CheckinValues } from "./schema";
import { checkInPassengers } from "./service";

/** US-38: check-in de los pasajeros elegidos. La titularidad sale solo de la sesión. */
export async function checkInAction(
  values: CheckinValues,
): Promise<ActionResult<{ checkedIn: number }>> {
  const user = await getCurrentUser();
  if (!user || !user.isActive) {
    return { ok: false, error: "Tenés que iniciar sesión para hacer el check-in." };
  }

  const parsed = checkinSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const result = await checkInPassengers(parsed.data.reserva, user.id, parsed.data.pasajes);
  if (result.ok) {
    revalidatePath("/compra/checkin");
    revalidatePath("/cuenta");
  }
  return result;
}
