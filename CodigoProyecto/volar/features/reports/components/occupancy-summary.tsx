import { formatCurrency } from "@/features/flights/format";
import type { OccupancySummary } from "../queries";

// US-27: KPIs globales del período filtrado (ocupación global, vendidos vs.
// disponibles, ocupación por clase y recaudación bruta confirmada).
export function OccupancySummaryCards({ summary }: { summary: OccupancySummary }) {
  const available = Math.max(0, summary.totalCapacity - summary.totalSold);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatBox label="Ocupación Promedio Global" value={`${summary.occupancyRate}%`} hint="Sobre capacidad total ofertada" />
      <StatBox
        label="Total Asientos Vendidos"
        value={String(summary.totalSold)}
        hint={`De ${summary.totalCapacity} disponibles · ${available} libres`}
      />
      <StatBox
        label="Ocupación por Clase"
        value={`${summary.economyOccupancyRate}% / ${summary.firstClassOccupancyRate}%`}
        hint="Economy / Primera"
      />
      <StatBox label="Recaudación Bruta Confirmada" value={formatCurrency(summary.grossRevenue)} hint="Pasajes emitidos" />
    </div>
  );
}

function StatBox({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs font-semibold text-muted-foreground uppercase">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
