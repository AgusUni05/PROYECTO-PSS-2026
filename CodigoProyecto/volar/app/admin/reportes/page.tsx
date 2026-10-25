import type { Metadata } from "next";
import { ListNavigationProvider, ListResults } from "@/components/list-navigation";
import { TableSkeleton } from "@/components/table-skeleton";
import { getOccupancyReport } from "@/features/reports/queries";
import { ReportFilters } from "@/features/reports/components/report-filters";
import { OccupancySummaryCards } from "@/features/reports/components/occupancy-summary";
import { OccupancyTable } from "@/features/reports/components/occupancy-table";
import { listActiveRoutes } from "@/features/routes/queries";

export const metadata: Metadata = { title: "Reportes de ocupación — VolAR Admin" };

type SearchParams = { desde?: string; hasta?: string; ruta?: string; clase?: string; page?: string };

// US-27: reportes de ocupación por vuelo, clase y fecha (reportes_admin.html).
export default async function ReportesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const [{ flights, total, page, pageCount, filters, summary }, routes] = await Promise.all([
    getOccupancyReport(sp),
    listActiveRoutes(),
  ]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Administración &gt; Inteligencia Operativa &gt;{" "}
        <span className="font-medium text-foreground">Reportes de Ocupación</span>
      </p>

      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Métricas de Ocupación por Vuelo, Clase y Fecha
        </h1>
        <p className="text-sm text-muted-foreground">
          Análisis de carga por vuelo, clase y fechas para decidir frecuencias, tarifas y capacidad.
        </p>
      </div>

      <ListNavigationProvider>
        <ReportFilters filters={filters} routes={routes} />

        <ListResults skeleton={<TableSkeleton columns={6} />}>
          <div className="space-y-6">
            <OccupancySummaryCards summary={summary} />
            <OccupancyTable flights={flights} total={total} page={page} pageCount={pageCount} filters={filters} />
          </div>
        </ListResults>
      </ListNavigationProvider>
    </div>
  );
}
