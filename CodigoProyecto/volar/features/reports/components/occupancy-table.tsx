import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationLinks } from "@/components/pagination-links";
import { formatCurrency, formatDate } from "@/features/flights/format";
import type { OccupancyReportRow } from "../queries";
import type { ReportFilters } from "../schema";

type Props = {
  flights: OccupancyReportRow[];
  total: number;
  page: number;
  pageCount: number;
  filters: ReportFilters;
};

// US-27: detalle de ocupación por vuelo, con desglose por clase.
export function OccupancyTable({ flights, total, page, pageCount, filters }: Props) {
  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    if (filters.desde) params.set("desde", filters.desde);
    if (filters.hasta) params.set("hasta", filters.hasta);
    if (filters.ruta) params.set("ruta", filters.ruta);
    if (filters.clase !== "todas") params.set("clase", filters.clase);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return `/admin/reportes${qs ? `?${qs}` : ""}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ocupación por Vuelo, Clase y Fecha (Total: {total})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vuelo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead>Economy</TableHead>
                <TableHead>Primera</TableHead>
                <TableHead>Ingresos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flights.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Sin vuelos para los filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
              {flights.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.code}</TableCell>
                  <TableCell>{formatDate(f.date)}</TableCell>
                  <TableCell>
                    {f.originCode} → {f.destinationCode}
                    <span className="block text-xs text-muted-foreground">{f.airplaneModel}</span>
                  </TableCell>
                  <TableCell>
                    {f.economySold} / {f.economyCapacity}
                  </TableCell>
                  <TableCell>
                    {f.firstClassSold} / {f.firstClassCapacity}
                  </TableCell>
                  <TableCell>{formatCurrency(f.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <PaginationLinks page={page} pageCount={pageCount} buildHref={buildHref} />
      </CardContent>
    </Card>
  );
}
