import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/features/flights/format";
import type { ReservationSummary } from "../queries";

// US-34: resultados de la búsqueda; cada fila abre el detalle completo.
export function ReservationResultsList({
  criterio,
  results,
}: {
  criterio: string;
  results: ReservationSummary[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {results.length} resultado(s) para &quot;{criterio}&quot;
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {results.length === 0 && (
          <p className="text-sm text-muted-foreground">No encontramos ninguna reserva con ese criterio.</p>
        )}
        {results.map((r) => (
          <Link
            key={r.code}
            href={`/mostrador/reservas?${new URLSearchParams({ criterio, codigo: r.code })}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm hover:bg-muted"
          >
            <div>
              <b>{r.code}</b> · {r.contactName}
              <div className="text-xs text-muted-foreground">
                {r.flightCode} · {r.originCode} → {r.destinationCode} · {formatDate(r.date)}
              </div>
            </div>
            <Badge variant={r.status === "CONFIRMED" ? "success" : "secondary"}>{r.status}</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
