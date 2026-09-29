import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getCurrentUser, isAdmin } from "@/lib/auth";

// Cabecera del sitio público (US-28/US-29): no exige sesión. La sesión es un
// control chico en la esquina — estilo despegar.com.ar, la cuenta se pide
// recién al iniciar una compra. Misma estética "torre de control" que el panel.
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-[var(--tower-border)] bg-[var(--tower)] text-[var(--tower-foreground)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-heading text-lg font-semibold tracking-tight">VolAR</span>
          <span className="hidden font-mono text-[0.6875rem] tracking-[0.2em] text-[var(--tower-foreground)]/60 uppercase sm:inline">
            Portal de Pasajeros
          </span>
        </Link>

        {!user && (
          <Link
            href="/sign-in"
            className="text-sm text-[var(--tower-foreground)]/80 underline underline-offset-2 hover:text-[var(--tower-foreground)]"
          >
            Iniciar sesión
          </Link>
        )}
        {user && (
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-[var(--tower-foreground)]/80 sm:inline">
              {user.firstName} {user.lastName}
            </span>
            <Link href="/cuenta" className="underline underline-offset-2 hover:text-[var(--tower-accent)]">
              Mi cuenta
            </Link>
            {isAdmin(user) && (
              <Link href="/admin" className="underline underline-offset-2 hover:text-[var(--tower-accent)]">
                Panel de administración
              </Link>
            )}
            <UserButton />
          </div>
        )}
      </div>
    </header>
  );
}
