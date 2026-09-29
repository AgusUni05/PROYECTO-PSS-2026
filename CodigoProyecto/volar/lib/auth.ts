import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { forbidden, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/id";
import type { User } from "@/generated/prisma/client";

/**
 * Usuario local (tabla `users`) de la sesión actual, vinculado por clerkId.
 * Si es la primera vez que este usuario de Clerk entra al sistema, se crea
 * la fila local con rol PASSENGER por defecto (US-28).
 * `null` si no hay sesión iniciada. Memoizado por request (React cache).
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await prisma.user.findUnique({ where: { clerkId: userId } });
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
      clerkId: userId,
      email,
      firstName: clerkUser.firstName ?? "",
      lastName: clerkUser.lastName ?? "",
    },
  });
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
