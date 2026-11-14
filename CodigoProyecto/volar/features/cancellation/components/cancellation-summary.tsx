import { formatLongDate } from "@/features/flights/format";
import { formatPesos } from "../format";
import { CANCELLATION_POLICY, formatRetention } from "../policy";
import type { CancellationQuote } from "../quote";

// US-39: pasajes a cancelar, liquidación del reintegro y cuadro de la política
// de penalidades (cambio_cancelacion_pasajero.html).
export function CancellationSummary({ quote }: { quote: CancellationQuote }) {
  return (
    <div className="grid gap-4">
      <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-extrabold">Pasajes a cancelar</h2>
        <ul className="mt-3 divide-y divide-border">
          {quote.lines.map((line) => (
            <li key={line.ticketId} className="flex min-w-0 flex-wrap items-start justify-between gap-2 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold break-words">{line.passenger}</p>
                <p className="text-xs text-muted-foreground break-words">
                  {`${line.flight.code} · ${line.flight.origin.code} → ${line.flight.destination.code} · ${formatLongDate(line.flight.date)}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {`${line.tierLabel} · Retención ${formatRetention(line.retentionRate)}`}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="text-muted-foreground">{`Abonado ${formatPesos(line.paid)}`}</p>
                <p className="font-bold">{`Reintegro ${formatPesos(line.refund)}`}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-extrabold">Liquidación del reembolso</h2>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Importe abonado</dt>
            <dd className="font-semibold">{formatPesos(quote.totals.paid)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Retención por penalidad</dt>
            <dd className="font-semibold text-destructive">{`- ${formatPesos(quote.totals.penalty)}`}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Medio de acreditación</dt>
            <dd className="text-right font-semibold break-words">{quote.paymentMethod}</dd>
          </div>
          <div className="mt-1 flex items-end justify-between gap-3 border-t border-dashed border-border pt-3">
            <dt className="font-bold">Monto neto a reembolsar</dt>
            <dd className="text-xl font-extrabold">{formatPesos(quote.totals.refund)}</dd>
          </div>
        </dl>
      </section>

      <section className="min-w-0 rounded-2xl border border-border bg-muted/50 p-4 text-sm sm:p-5">
        <h2 className="text-base font-extrabold">Política de penalidades</h2>
        <p className="mt-1 text-muted-foreground">
          La retención depende de la anticipación con la que cancelás respecto de la salida del vuelo.
        </p>
        <ul className="mt-3 grid gap-1.5">
          {CANCELLATION_POLICY.map((tier) => (
            <li key={tier.label} className="flex justify-between gap-3">
              <span>{tier.label}</span>
              <b>{`Retención ${formatRetention(tier.retentionRate)}`}</b>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
