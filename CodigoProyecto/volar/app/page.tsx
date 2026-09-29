import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getCurrentUser, isAdmin } from "@/lib/auth";

// Sitio público (US-28/US-29): no exige sesión para nada. La sesión es un
// control chico y secundario en la esquina, no el CTA principal de la página
// — estilo despegar.com.ar, la cuenta se pide recién al comprar un pasaje
// (US-15+, fuera de este alcance).
export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex justify-end px-6 py-4">
        {!user && (
          <Link
            href="/sign-in"
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Iniciar sesión
          </Link>
        )}
        {user && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              {user.firstName} {user.lastName}
            </span>
            <Link href="/cuenta" className="underline underline-offset-2 hover:text-foreground">
              Mi cuenta
            </Link>
            {isAdmin(user) && (
              <Link href="/admin" className="underline underline-offset-2 hover:text-foreground">
                Panel de administración
              </Link>
            )}
            <UserButton />
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-24 text-center">
        <span className="font-mono text-xs tracking-[0.3em] text-muted-foreground uppercase">
          Sistema de Gestión de Vuelos
        </span>
        <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">VolAR</h1>
        <p className="max-w-md text-sm text-muted-foreground sm:text-base">
          Volá por Argentina con VolAR.
        </p>
      </main>
    </div>
  );
}
