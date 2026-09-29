"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { idSchema } from "@/lib/id";
import type { ActionResult } from "@/lib/action-result";
import { routeFormSchema, type RouteFormValues } from "./schema";
import * as routeService from "./service";

const ADMIN_PATH = "/admin/trayectos";

export async function createRouteAction(
  values: RouteFormValues,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = routeFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await routeService.createRoute(parsed.data);
  if (result.ok) revalidatePath(ADMIN_PATH);
  return result;
}

export async function updateRouteAction(
  id: string,
  values: RouteFormValues,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  if (!idSchema("Route").safeParse(id).success) {
    return { ok: false, error: "Trayecto inválido" };
  }

  const parsed = routeFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await routeService.updateRoute(id, parsed.data);
  if (result.ok) revalidatePath(ADMIN_PATH);
  return result;
}

export async function deactivateRouteAction(id: string): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  if (!idSchema("Route").safeParse(id).success) {
    return { ok: false, error: "Trayecto inválido" };
  }

  const result = await routeService.deactivateRoute(id);
  if (result.ok) revalidatePath(ADMIN_PATH);
  return result;
}
