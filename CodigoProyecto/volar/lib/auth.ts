import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { forbidden, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/id";
import type { User } from "@/generated/prisma/client";

/**
 * Usuario local (tabla `users`) vinculado a un clerkId. Si es la primera vez
 * que este usuario de Clerk entra al sistema, crea la fila local con rol
 * PASSENGER por defecto (US-28). `null` si Clerk no tiene datos del usuario
 * (no debería pasar con un clerkId válido, pero se guarda contra eso).
 * Función plana (sin cache()) para poder testearla de forma aislada.
 */
export async function syncClerkUser(clerkId: string): Promise<User | null> {
  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  return prisma.user.create({
    data: {
      id: newId("User"),
      clerkId,
      email,
      firstName: clerkUser.firstName ?? "",
      lastName: clerkUser.lastName ?? "",
    },
  });
}

/**
 * Usuario local de la sesión actual (ver syncClerkUser). `null` si no hay
 * sesión iniciada. Memoizado por request (React cache) para no repetir la
 * sincronización en cada llamada durante el mismo render.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const { userId } = await auth();
  if (!userId) return null;
  return syncClerkUser(userId);
});

/** Regla US-30: solo un usuario con rol ADMIN activo entra al panel. */
export function isAdmin(user: User | null): user is User {
  return user !== null && user.role === "ADMIN" && user.isActive;
}

/**
 * Exige un usuario con rol ADMIN activo (US-30/US-31). Sin sesión → redirige
 * a sign-in; sin permiso → 403. Se usa tanto en admin/layout.tsx como al
 * principio de cada server action del panel (el layout no protege actions).
 */
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!isAdmin(user)) forbidden();
  return user;
}

/**
 * Guardia reutilizable para vistas que requieren un usuario autenticado.
 * Sin sesión → redirige a sign-in. No impone ningún rol.
 */
export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/**
 * Guardia reutilizable para vistas de pasajeros (US-28 / US-35). Sin sesión →
 * redirige a sign-in; sin rol PASSENGER o con la cuenta desactivada → 403.
 * Es la única fuente del `userId` con el que se consulta el historial de
 * compras: nunca se acepta desde el cliente.
 */
export async function requirePassenger(): Promise<User> {
  const user = await requireCurrentUser();
  if (user.role !== "PASSENGER" || !user.isActive) forbidden();
  return user;
}
