"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { idSchema } from "@/lib/id";
import { dispatchPendingContingencyEmails } from "@/lib/mailer/dispatch";
import type { ActionResult } from "@/lib/action-result";
import {
  cancelFlightSchema,
  cancelRouteFlightsSchema,
  editFlightFormSchema,
  generateFlightsFormSchema,
  type CancelFlightValues,
  type CancelRouteFlightsValues,
  type EditFlightFormValues,
  type GenerateFlightsFormValues,
} from "./schema";
import * as flightsService from "./service";

const ADMIN_PATH = "/admin/vuelos";

/**
 * US-25: al cambiar o cancelar un vuelo se crea el outbox de contingencias.
 * Intentamos enviarlo en el mismo request para que el pasajero reciba el
 * aviso sin depender de ejecutar `pnpm mail:send` a mano. Un fallo de SMTP no
 * invalida la operación administrativa: la fila queda pendiente para reintento.
 */
async function sendPendingContingencyEmails(): Promise<void> {
  try {
    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    await dispatchPendingContingencyEmails(baseUrl);
  } catch (error) {
    console.error("No se pudieron enviar los emails de contingencia:", error);
  }
}

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
  if (result.ok) {
    revalidatePath(ADMIN_PATH);
    await sendPendingContingencyEmails();
  }
  return result;
}

export async function cancelFlightAction(
  id: string,
  values: CancelFlightValues,
): Promise<ActionResult<{ id: string; affectedTickets: number }>> {
  const admin = await requireAdmin();

  if (!idSchema("Flight").safeParse(id).success) {
    return { ok: false, error: "Vuelo inválido" };
  }

  const parsed = cancelFlightSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await flightsService.cancelFlight(id, parsed.data, admin.id);
  if (result.ok) {
    revalidatePath(ADMIN_PATH);
    await sendPendingContingencyEmails();
  }
  return result;
}

export async function cancelRouteFlightsAction(
  values: CancelRouteFlightsValues,
): Promise<ActionResult<{ cancelled: number; affectedTickets: number }>> {
  const admin = await requireAdmin();

  const parsed = cancelRouteFlightsSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await flightsService.cancelFlightsByRoute(parsed.data, admin.id);
  if (result.ok) {
    revalidatePath(ADMIN_PATH);
    await sendPendingContingencyEmails();
  }
  return result;
}
