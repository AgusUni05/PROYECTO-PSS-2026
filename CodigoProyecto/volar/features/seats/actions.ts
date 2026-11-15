"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { seatSelectionSchema, type SeatSelectionValues } from "./schema";
import { chooseSeats } from "./service";

/** US-37: guarda los asientos elegidos en el mapa. La titularidad sale solo de la sesión. */
export async function chooseSeatsAction(
  values: SeatSelectionValues,
): Promise<ActionResult<{ changed: number }>> {
  const user = await getCurrentUser();
  if (!user || !user.isActive) {
    return { ok: false, error: "Tenés que iniciar sesión para elegir asientos." };
  }

  const parsed = seatSelectionSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { reserva, vuelo, asientos } = parsed.data;
  const result = await chooseSeats(
    reserva,
    user.id,
    vuelo,
    asientos.map((choice) => ({ ticketId: choice.pasaje, seat: choice.asiento })),
  );
  if (result.ok && result.data.changed > 0) {
    revalidatePath("/compra/checkin");
    revalidatePath("/cuenta");
  }
  return result;
}
