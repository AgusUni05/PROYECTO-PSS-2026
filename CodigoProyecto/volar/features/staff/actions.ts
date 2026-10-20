"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { idSchema } from "@/lib/id";
import type { ActionResult } from "@/lib/action-result";
import { staffFormSchema, staffRoleSchema, type StaffFormValues, type StaffRole } from "./schema";
import * as staffService from "./service";

const ADMIN_PATH = "/admin/personal";

export async function createStaffAction(
  values: StaffFormValues,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();

  const parsed = staffFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await staffService.createStaffAccount(parsed.data, admin.id);
  if (result.ok) revalidatePath(ADMIN_PATH);
  return result;
}

export async function deactivateStaffAction(id: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();

  if (!idSchema("User").safeParse(id).success) {
    return { ok: false, error: "Cuenta inválida" };
  }

  const result = await staffService.deactivateStaff(id, admin.id);
  if (result.ok) revalidatePath(ADMIN_PATH);
  return result;
}

export async function reactivateStaffAction(id: string): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  if (!idSchema("User").safeParse(id).success) {
    return { ok: false, error: "Cuenta inválida" };
  }

  const result = await staffService.reactivateStaff(id);
  if (result.ok) revalidatePath(ADMIN_PATH);
  return result;
}

export async function changeStaffRoleAction(
  id: string,
  role: StaffRole,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();

  if (!idSchema("User").safeParse(id).success) {
    return { ok: false, error: "Cuenta inválida" };
  }

  const parsed = staffRoleSchema.safeParse({ role });
  if (!parsed.success) return { ok: false, error: "Rol inválido" };

  const result = await staffService.changeStaffRole(id, parsed.data.role, admin.id);
  if (result.ok) revalidatePath(ADMIN_PATH);
  return result;
}
