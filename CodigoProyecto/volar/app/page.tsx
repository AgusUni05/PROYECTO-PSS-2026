import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <span className="font-mono text-xs tracking-[0.3em] text-muted-foreground uppercase">
        Sistema de Gestión de Vuelos
      </span>
      <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">VolAR</h1>
      <p className="max-w-md text-sm text-muted-foreground sm:text-base">
        Panel de administración de aeropuertos, flota y trayectos.
      </p>
      <div className="flex gap-3">
        <Show when="signed-in">
          <Link href="/admin" className={buttonVariants()}>
            Ir al panel de administración
          </Link>
        </Show>
        <Show when="signed-out">
          <Link href="/sign-in" className={buttonVariants()}>
            Iniciar sesión
          </Link>
        </Show>
      </div>
    </main>
  );
}
