"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { idSchema } from "@/lib/id";
import type { ActionResult } from "@/lib/action-result";
import { airportFormSchema, type AirportFormValues } from "./schema";
import * as airportService from "./service";

const ADMIN_PATH = "/admin/aeropuertos";

export async function createAirportAction(
  values: AirportFormValues,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = airportFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await airportService.createAirport(parsed.data);
  if (result.ok) revalidatePath(ADMIN_PATH);
  return result;
}

export async function updateAirportAction(
  id: string,
  values: AirportFormValues,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  if (!idSchema("Airport").safeParse(id).success) {
    return { ok: false, error: "Aeropuerto inválido" };
  }

  const parsed = airportFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await airportService.updateAirport(id, parsed.data);
  if (result.ok) revalidatePath(ADMIN_PATH);
  return result;
}

export async function deactivateAirportAction(id: string): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  if (!idSchema("Airport").safeParse(id).success) {
    return { ok: false, error: "Aeropuerto inválido" };
  }

  const result = await airportService.deactivateAirport(id);
  if (result.ok) revalidatePath(ADMIN_PATH);
  return result;
}
