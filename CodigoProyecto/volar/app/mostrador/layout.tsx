import Link from "next/link";
import { requireCounterAgent } from "@/lib/auth";

// US-30: solo COUNTER_AGENT entra a la terminal de mostrador.
export default async function MostradorLayout({ children }: { children: React.ReactNode }) {
  const agent = await requireCounterAgent();

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Terminal de Mostrador</h1>
          <p className="text-sm text-muted-foreground">
            Operador: {agent.firstName} {agent.lastName}
          </p>
        </div>
        <nav className="flex gap-2 text-sm font-semibold">
          <Link href="/mostrador" className="rounded-full border border-border px-4 py-2 hover:bg-muted">
            Búsqueda de Vuelos (US-32)
          </Link>
          <Link href="/mostrador/reservas" className="rounded-full border border-border px-4 py-2 hover:bg-muted">
            Consultar Reservas (US-34)
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
