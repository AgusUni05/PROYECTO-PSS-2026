import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { UserProfile } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";
import { AccountShell } from "@/components/account-shell";
import { requireCurrentUser } from "@/lib/auth";
import { getPurchaseHistoryForUser } from "@/features/purchase/history";
import { PurchaseHistoryView } from "@/features/purchase/components/purchase-history";

export const metadata: Metadata = {
  title: "Mis compras — VolAR",
};

// US-35: cuenta del usuario logueado. El historial solo se consulta para un
// pasajero activo en la raíz de /cuenta; el resto de los roles y las rutas
// internas de Clerk ([[...cuenta]]) siguen viendo su perfil.
export default async function CuentaPage({
  params,
}: {
  params: Promise<{ cuenta?: string[] }>;
}) {
  const user = await requireCurrentUser();
  if (!user.isActive) forbidden();

  const segments = (await params).cuenta ?? [];

  if (segments.length > 0) {
    if (segments[0] === "perfil") {
      return (
        <AccountShell
          title="Mi perfil"
          description="Administrá tus datos de acceso y seguridad."
        >
          <UserProfile routing="hash" />
        </AccountShell>
      );
    }

    // Rutas internas de Clerk (ej. /cuenta/security).
    return (
      <AccountShell title="Mi cuenta">
        <UserProfile />
      </AccountShell>
    );
  }

  if (user.role !== "PASSENGER") {
    return (
      <AccountShell title="Mi cuenta" description="Tu cuenta de VolAR.">
        <UserProfile />
      </AccountShell>
    );
  }

  // El userId es siempre el de la sesión, nunca un dato del cliente.
  const history = await getPurchaseHistoryForUser(user.id);

  return (
    <AccountShell
      title="Mis Compras y Pasajes Electrónicos"
      description="Consultá tus próximos vuelos, tu historial y la documentación de tus compras."
      actions={
        <Link href="/cuenta/perfil" className={buttonVariants({ variant: "outline" })}>
          Mi perfil
        </Link>
      }
    >
      <PurchaseHistoryView history={history} />
    </AccountShell>
  );
}
