import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { PlaneIcon } from "@/components/plane-icon";

// Cabecera del sitio público (US-28/US-29): no exige sesión. La sesión es un
// control chico en la esquina — estilo despegar.com.ar, la cuenta se pide
// recién al iniciar una compra.
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="bg-tower text-tower-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-8">
        <Link href="/" className="group/logo flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
          <span className="grid size-[34px] place-items-center rounded-[10px] bg-primary transition-transform duration-500 group-hover/logo:-rotate-[14deg]">
            <PlaneIcon className="size-[18px]" />
          </span>
          VolAR
        </Link>

        {!user && (
          <Link
            href="/sign-in"
            className="inline-flex h-[42px] items-center gap-2 rounded-full border border-white/28 px-[18px] text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10"
          >
            Iniciar sesión
          </Link>
        )}
        {user && (
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-tower-muted sm:inline">
              {user.firstName} {user.lastName}
            </span>
            <Link href="/cuenta" className="font-semibold text-white underline-offset-2 hover:text-tower-accent hover:underline">
              Mi cuenta
            </Link>
            {isAdmin(user) && (
              <Link href="/admin" className="font-semibold text-white underline-offset-2 hover:text-tower-accent hover:underline">
                <span className="sm:hidden">Admin</span>
                <span className="hidden sm:inline">Panel de administración</span>
              </Link>
            )}
            <UserButton />
          </div>
        )}
      </div>
    </header>
  );
}
