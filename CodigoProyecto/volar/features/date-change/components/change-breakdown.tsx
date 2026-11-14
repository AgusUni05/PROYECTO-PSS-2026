import { formatPesos } from "@/features/cancellation/format";
import { formatRetention } from "@/features/cancellation/policy";
import type { ChangeQuote } from "../quote";

// US-39: desglose del cambio voluntario (cambio_cancelacion_pasajero.html).
export function ChangeBreakdown({ quote }: { quote: ChangeQuote }) {
  const rows: [string, string][] = [
    ["Crédito por pasajes originales", formatPesos(quote.credit)],
    ["Costo del nuevo vuelo", formatPesos(quote.newCost)],
    ["Diferencia de tarifa", `+ ${formatPesos(quote.fareDifference)}`],
    [
      `Penalidad por cambio (${formatRetention(quote.penaltyRate ?? 0)})`,
      `+ ${formatPesos(quote.penalty)}`,
    ],
  ];

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="text-base font-extrabold">Desglose del cambio</h2>
      {quote.tierLabel && (
        <p className="mt-1 text-sm text-muted-foreground">
          {`${quote.tierLabel} de la salida. Si el vuelo nuevo es más barato, la diferencia no se devuelve.`}
        </p>
      )}
      <dl className="mt-3 grid gap-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold whitespace-nowrap">{value}</dd>
          </div>
        ))}
        <div className="mt-1 flex items-end justify-between gap-3 border-t border-dashed border-border pt-3">
          <dt className="font-bold">Adicional a abonar</dt>
          <dd className="text-xl font-extrabold whitespace-nowrap">{formatPesos(quote.total)}</dd>
        </div>
      </dl>
    </section>
  );
}
