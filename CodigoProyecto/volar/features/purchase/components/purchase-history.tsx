import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/features/flights/format";
import type { PurchaseHistory, PurchaseHistoryEntry } from "@/features/purchase/history";
import {
  PurchaseCard,
  PurchaseContingencyAlerts,
  PurchaseDownloadActions,
} from "./purchase-card";
import { PurchaseStatus } from "./purchase-status";
import { groupTicketsByFlight } from "./purchase-summary";

/**
 * US-35: "Mis Compras". Dos bloques: próximos vuelos / reservas activas y el
 * historial de compras pasadas. Se usa layout de tarjetas y filas apiladas
 * (nunca tablas) para que no haya scroll horizontal en pantallas de 320 px.
 */
export function PurchaseHistoryView({ history }: { history: PurchaseHistory }) {
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="upcoming-heading" className="min-w-0">
        <h2
          id="upcoming-heading"
          className="border-b border-border pb-2 text-[15px] font-extrabold"
        >
          Próximos vuelos y reservas activas
        </h2>

        {history.upcoming.length > 0 ? (
          <div className="mt-3 grid gap-4">
            {history.upcoming.map((entry) => (
              <PurchaseCard key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-center">
            <p className="text-sm font-semibold">No tenés vuelos próximos</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cuando compres un pasaje lo vas a encontrar acá con sus datos de vuelo.
            </p>
            <Link
              href="/vuelos"
              className={buttonVariants({ variant: "outline", className: "mt-3" })}
            >
              Buscar vuelos
            </Link>
          </div>
        )}
      </section>

      <section aria-labelledby="past-heading" className="min-w-0">
        <h2 id="past-heading" className="border-b border-border pb-2 text-[15px] font-extrabold">
          Historial de compras pasadas
        </h2>

        {history.past.length > 0 ? (
          <ul className="mt-3 grid gap-3">
            {history.past.map((entry) => (
              <li key={entry.id} className="min-w-0">
                <PurchaseHistoryRow entry={entry} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Todavía no tenés compras pasadas.</p>
        )}
      </section>
    </div>
  );
}

/**
 * US-35: fila compacta del historial. Muestra la ruta del primer vuelo (o
 * "Varios vuelos" si una reprogramación dejó pasajes en vuelos distintos) y
 * conserva las alertas urgentes de contingencias pendientes.
 */
function PurchaseHistoryRow({ entry }: { entry: PurchaseHistoryEntry }) {
  const groups = groupTicketsByFlight(entry.tickets);
  const firstFlight = groups[0]?.flight ?? null;
  const passengerCount =
    entry.tickets.length === 1 ? "1 pasaje" : `${entry.tickets.length} pasajes`;

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{`Compra del ${formatDate(entry.createdAt)}`}</p>
          <p className="font-mono text-sm font-extrabold break-words">{entry.code}</p>
        </div>
        <PurchaseStatus status={entry.status} past />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-4">
        <div className="min-w-0">
          <dt className="text-muted-foreground">Ruta</dt>
          <dd className="font-semibold break-words">
            {groups.length > 1
              ? "Varios vuelos"
              : firstFlight
                ? `${firstFlight.origin.code} → ${firstFlight.destination.code}`
                : "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Fecha del vuelo</dt>
          <dd className="font-semibold">{firstFlight ? formatDate(firstFlight.date) : "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Pasajes</dt>
          <dd className="font-semibold">{passengerCount}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Total</dt>
          <dd className="font-semibold break-words">{formatCurrency(entry.totalAmount)}</dd>
        </div>
      </dl>

      <PurchaseContingencyAlerts entry={entry} />

      <div className="mt-3 border-t border-border pt-3">
        <PurchaseDownloadActions entry={entry} />
      </div>
    </div>
  );
}
