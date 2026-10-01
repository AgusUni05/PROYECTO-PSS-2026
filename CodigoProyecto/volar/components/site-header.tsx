import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getCurrentUser, isAdmin } from "@/lib/auth";

// Cabecera del sitio público (US-28/US-29): no exige sesión. La sesión es un
// control chico en la esquina — estilo despegar.com.ar, la cuenta se pide
// recién al iniciar una compra.
export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="bg-tower text-tower-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-8 py-5">
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

function PlaneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}
