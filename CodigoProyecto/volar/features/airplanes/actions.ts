"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { idSchema } from "@/lib/id";
import type { ActionResult } from "@/lib/action-result";
import { airplaneFormSchema, type AirplaneFormValues } from "./schema";
import * as airplaneService from "./service";

const ADMIN_PATH = "/admin/aviones";

export async function createAirplaneAction(
  values: AirplaneFormValues,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = airplaneFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await airplaneService.createAirplane(parsed.data);
  if (result.ok) revalidatePath(ADMIN_PATH);
  return result;
}

export async function updateAirplaneAction(
  id: string,
  values: AirplaneFormValues,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  if (!idSchema("Airplane").safeParse(id).success) {
    return { ok: false, error: "Avión inválido" };
  }

  const parsed = airplaneFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await airplaneService.updateAirplane(id, parsed.data);
  if (result.ok) revalidatePath(ADMIN_PATH);
  return result;
}

export async function deactivateAirplaneAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  if (!idSchema("Airplane").safeParse(id).success) {
    return { ok: false, error: "Avión inválido" };
  }

  const result = await airplaneService.deactivateAirplane(id);
  if (result.ok) revalidatePath(ADMIN_PATH);
  return result;
}
