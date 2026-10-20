import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/id";
import type { ActionResult } from "@/lib/action-result";
import type { StaffFormValues, StaffRole } from "./schema";

const DUPLICATE_EMAIL: ActionResult<never> = {
  ok: false,
  fieldErrors: { email: ["Ya existe una cuenta con este email"] },
};

const NOT_FOUND: ActionResult<never> = { ok: false, error: "La cuenta de personal no existe." };

/** Traduce los rechazos de Clerk al alta (email repetido, contraseña débil) a errores del formulario. */
function clerkCreateError(err: unknown): ActionResult<never> | null {
  if (!isClerkAPIResponseError(err)) return null;

  const code = err.errors[0]?.code ?? "";
  if (code === "form_identifier_exists") return DUPLICATE_EMAIL;
  if (code === "form_password_pwned") {
    return {
      ok: false,
      fieldErrors: {
        password: ["Esta contraseña aparece en filtraciones de datos conocidas. Elegí otra."],
      },
    };
  }
  if (code.startsWith("form_password")) {
    return {
      ok: false,
      fieldErrors: { password: ["La contraseña no cumple los requisitos de seguridad de Clerk."] },
    };
  }
  if (code === "form_param_format_invalid") {
    return { ok: false, fieldErrors: { email: ["Ingresá un email válido"] } };
  }
  return {
    ok: false,
    error: `Clerk rechazó el alta: ${err.errors[0]?.longMessage ?? err.message}`,
  };
}

/**
 * US-31: alta de una cuenta de personal (Administrador o Empleado de Mostrador).
 * Crea el usuario en Clerk (credenciales) y luego la fila local con el rol y el
 * administrador que la creó (trazabilidad). Si falla la fila local, se borra el
 * usuario recién creado en Clerk para no dejarlo huérfano.
 */
export async function createStaffAccount(
  data: StaffFormValues,
  createdById: string,
): Promise<ActionResult<{ id: string }>> {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return DUPLICATE_EMAIL;

  const clerk = await clerkClient();
  let clerkUserId: string;
  try {
    const clerkUser = await clerk.users.createUser({
      emailAddress: [data.email],
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
    });
    clerkUserId = clerkUser.id;
  } catch (err) {
    const result = clerkCreateError(err);
    if (result) return result;
    throw err;
  }

  try {
    const user = await prisma.user.create({
      data: {
        id: newId("User"),
        clerkId: clerkUserId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        createdById,
      },
    });
    return { ok: true, data: { id: user.id } };
  } catch (err) {
    await clerk.users.deleteUser(clerkUserId).catch((cleanupErr) => {
      console.error("No se pudo revertir el usuario de Clerk", clerkUserId, cleanupErr);
    });
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return DUPLICATE_EMAIL;
    }
    throw err;
  }
}

/** Cuenta de personal (no pasajero) por id, o null. */
async function findStaff(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  return user && user.role !== "PASSENGER" ? user : null;
}

/**
 * Bloquea o desbloquea el inicio de sesión en Clerk. Un usuario que no existe en
 * Clerk (404, p.ej. datos de demo) no tiene sesión que bloquear: se ignora.
 */
async function setClerkBan(clerkId: string, banned: boolean): Promise<void> {
  const clerk = await clerkClient();
  try {
    if (banned) await clerk.users.banUser(clerkId);
    else await clerk.users.unbanUser(clerkId);
  } catch (err) {
    if (isClerkAPIResponseError(err) && err.status === 404) return;
    throw err;
  }
}

/**
 * US-31: deshabilita una cuenta de personal sin borrarla (baja lógica): queda
 * isActive = false, conservando todas sus operaciones (trazabilidad), y se
 * bloquea su inicio de sesión en Clerk. Un admin no puede deshabilitarse a sí mismo.
 */
export async function deactivateStaff(
  id: string,
  adminId: string,
): Promise<ActionResult<{ id: string }>> {
  if (id === adminId) return { ok: false, error: "No podés deshabilitar tu propia cuenta." };

  const user = await findStaff(id);
  if (!user) return NOT_FOUND;
  if (!user.isActive) return { ok: false, error: "La cuenta ya está deshabilitada." };

  await setClerkBan(user.clerkId, true);
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  return { ok: true, data: { id } };
}

/** US-31: reactiva una cuenta de personal deshabilitada y desbloquea su inicio de sesión. */
export async function reactivateStaff(id: string): Promise<ActionResult<{ id: string }>> {
  const user = await findStaff(id);
  if (!user) return NOT_FOUND;
  if (user.isActive) return { ok: false, error: "La cuenta ya está activa." };

  await setClerkBan(user.clerkId, false);
  await prisma.user.update({ where: { id }, data: { isActive: true } });
  return { ok: true, data: { id } };
}

/** US-31: cambia el rol de una cuenta de personal. Un admin no puede cambiarse su propio rol. */
export async function changeStaffRole(
  id: string,
  role: StaffRole,
  adminId: string,
): Promise<ActionResult<{ id: string }>> {
  if (id === adminId) return { ok: false, error: "No podés cambiar tu propio rol." };

  const user = await findStaff(id);
  if (!user) return NOT_FOUND;

  await prisma.user.update({ where: { id }, data: { role } });
  return { ok: true, data: { id } };
}
