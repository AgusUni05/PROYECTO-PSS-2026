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
import { availableSeats } from "../availability";
import { formatCurrency, formatDate, formatTime } from "../format";
import { EditFlightDialog } from "./edit-flight-dialog";

type Props = {
  flights: FlightListItem[];
  total: number;
  page: number;
  pageCount: number;
  filters: FlightFilters;
};

// US-04: listado de vuelos reales generados. US-09/US-11: edición puntual de capacidad y tarifas
// (solo vuelos programados que no partieron; cancelación puntual es US-06).
export function FlightTable({ flights, total, page, pageCount, filters }: Props) {
  const now = new Date();

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
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flights.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
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
                    <SeatsCell capacity={f.economyCapacity} occupied={f.economyOccupied} />
                  </TableCell>
                  <TableCell>
                    <SeatsCell capacity={f.firstClassCapacity} occupied={f.firstClassOccupied} />
                  </TableCell>
                  <TableCell>
                    <div>Eco: {formatCurrency(f.economyFare)}</div>
                    <div>1ra: {formatCurrency(f.firstClassFare)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.status === "SCHEDULED" ? "default" : "secondary"}>
                      {f.status === "SCHEDULED" ? "Programado" : "Cancelado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {f.status === "SCHEDULED" && f.departureAt > now && <EditFlightDialog flight={f} />}
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

// US-09: cupo disponible = capacidad − vendidos, con tag "Agotado" en 0 (wireframe).
function SeatsCell({ capacity, occupied }: { capacity: number; occupied: number }) {
  const available = availableSeats(capacity, occupied);
  return (
    <>
      <div className="flex items-center gap-1.5">
        <span>
          Disp: <strong>{available}</strong> / {capacity}
        </span>
        {capacity > 0 && available === 0 && <Badge variant="destructive">Agotado</Badge>}
      </div>
      <small className="text-muted-foreground">({occupied} vendidos)</small>
    </>
  );
}
