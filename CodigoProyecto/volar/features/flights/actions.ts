"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { idSchema } from "@/lib/id";
import type { ActionResult } from "@/lib/action-result";
import {
  editFlightFormSchema,
  generateFlightsFormSchema,
  type EditFlightFormValues,
  type GenerateFlightsFormValues,
} from "./schema";
import * as flightsService from "./service";

const ADMIN_PATH = "/admin/vuelos";

export async function generateFlightsAction(
  values: GenerateFlightsFormValues,
): Promise<ActionResult<{ salesPeriodId: string; count: number }>> {
  const admin = await requireAdmin();

  const parsed = generateFlightsFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await flightsService.generateFlights(parsed.data, admin.id);
  if (result.ok) revalidatePath(ADMIN_PATH);
  return result;
}

export async function updateFlightAction(
  id: string,
  values: EditFlightFormValues,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();

  if (!idSchema("Flight").safeParse(id).success) {
    return { ok: false, error: "Vuelo inválido" };
  }

  const parsed = editFlightFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await flightsService.updateFlight(id, parsed.data, admin.id);
  if (result.ok) revalidatePath(ADMIN_PATH);
  return result;
}
