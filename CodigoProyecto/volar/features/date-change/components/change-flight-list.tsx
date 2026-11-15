import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency, formatLongDate, formatTime } from "@/features/flights/format";
import { MAX_CHANGE_CANDIDATES, type ChangeCandidate } from "../quote";

// US-39: vuelos de la misma ruta a los que se puede cambiar la reserva. Elegir
// uno recalcula la liquidación (vuelve a la página con ?vuelo=…) y lleva al
// desglose, que en mobile queda debajo de la lista.
export function ChangeFlightList({
  code,
  candidates,
  selectedId,
}: {
  code: string;
  candidates: ChangeCandidate[];
  selectedId: string | null;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="text-base font-extrabold">Elegí el nuevo vuelo</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {`Misma ruta y clase. Se muestran hasta ${MAX_CHANGE_CANDIDATES} vuelos próximos con cupo para todos los pasajeros.`}
      </p>
      <ul className="mt-3 grid grid-cols-1 gap-2">
        {candidates.map((candidate) => {
          const selected = candidate.id === selectedId;
          return (
            <li key={candidate.id}>
              <Link
                href={`/compra/cambiar?${new URLSearchParams({ reserva: code, vuelo: candidate.id })}#desglose`}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "flex min-w-0 cursor-pointer flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-sm transition-colors hover:border-primary hover:bg-secondary",
                  selected ? "border-primary bg-secondary" : "border-border",
                )}
              >
                <span className="min-w-0">
                  <b className="block break-words">{formatLongDate(candidate.date)}</b>
                  <span className="text-xs text-muted-foreground">
                    {`${candidate.code} · Salida ${formatTime(candidate.departureAt)} hs`}
                  </span>
                </span>
                <span className="text-right">
                  <b className="block whitespace-nowrap">{`${formatCurrency(candidate.fare)} por pasaje`}</b>
                  <span className="text-xs text-muted-foreground">{`${candidate.available} cupos`}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
