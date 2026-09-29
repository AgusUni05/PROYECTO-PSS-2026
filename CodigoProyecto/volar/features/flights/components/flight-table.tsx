import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationLinks } from "@/components/pagination-links";
import type { FlightListItem } from "../queries";
import type { FlightFilters } from "../schema";

type Props = {
  flights: FlightListItem[];
  total: number;
  page: number;
  pageCount: number;
  filters: FlightFilters;
};

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function formatDate(date: Date): string {
  const [y, m, d] = date.toISOString().slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function formatTime(date: Date): string {
  return date.toISOString().slice(11, 16);
}

// US-04: listado de vuelos reales generados, de solo lectura (edición/cancelación puntual: US-05/US-06, fuera de alcance).
export function FlightTable({ flights, total, page, pageCount, filters }: Props) {
  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    if (filters.fecha) params.set("fecha", filters.fecha);
    if (filters.origen) params.set("origen", filters.origen);
    if (filters.destino) params.set("destino", filters.destino);
    if (filters.estado !== "SCHEDULED") params.set("estado", filters.estado);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return `/admin/vuelos${qs ? `?${qs}` : ""}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cronograma y Ocupación (Total: {total})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Vuelo</TableHead>
                <TableHead>Fecha Real</TableHead>
                <TableHead>Horarios</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead>Avión</TableHead>
                <TableHead>Cupos Economy</TableHead>
                <TableHead>Cupos Primera</TableHead>
                <TableHead>Tarifas</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flights.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    Sin resultados para los filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
              {flights.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono font-medium">{f.code}</TableCell>
                  <TableCell>{formatDate(f.date)}</TableCell>
                  <TableCell className="font-mono">
                    {formatTime(f.departureAt)} → {formatTime(f.arrivalAt)}
                  </TableCell>
                  <TableCell className="font-mono">
                    {f.originCode} → {f.destinationCode}
                  </TableCell>
                  <TableCell>{f.airplaneIdentifier}</TableCell>
                  <TableCell>
                    <div>
                      Disp: <strong>{f.economyCapacity - f.economyOccupied}</strong> / {f.economyCapacity}
                    </div>
                    <small className="text-muted-foreground">({f.economyOccupied} vendidos)</small>
                  </TableCell>
                  <TableCell>
                    <div>
                      Disp: <strong>{f.firstClassCapacity - f.firstClassOccupied}</strong> /{" "}
                      {f.firstClassCapacity}
                    </div>
                    <small className="text-muted-foreground">({f.firstClassOccupied} vendidos)</small>
                  </TableCell>
                  <TableCell>
                    <div>Eco: {currencyFormatter.format(Number(f.economyFare))}</div>
                    <div>1ra: {currencyFormatter.format(Number(f.firstClassFare))}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.status === "SCHEDULED" ? "default" : "secondary"}>
                      {f.status === "SCHEDULED" ? "Programado" : "Cancelado"}
                    </Badge>
                  </TableCell>
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
