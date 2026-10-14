import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import type { ActiveAirplaneOption } from "@/features/airplanes/queries";
import { availableSeats } from "../availability";
import { formatCurrency, formatDate, formatTime } from "../format";
import { EditFlightDialog } from "./edit-flight-dialog";
import { CancelFlightButton } from "./cancel-flight-button";

type Props = {
  flights: FlightListItem[];
  total: number;
  page: number;
  pageCount: number;
  filters: FlightFilters;
  airplanes: ActiveAirplaneOption[];
};

// US-04: listado de vuelos reales generados. US-05/US-06/US-09/US-11: edición puntual de horario,
// avión, capacidad y tarifas, y cancelación puntual de vuelos programados que no partieron.
export function FlightTable({ flights, total, page, pageCount, filters, airplanes }: Props) {
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
        <div className="rounded-md border">
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
                    {f.status === "SCHEDULED" && (
                      <Badge variant="success" dot>
                        Programado
                      </Badge>
                    )}
                    {f.status === "COMPLETED" && (
                      <Badge variant="outline" dot>
                        Completado
                      </Badge>
                    )}
                    {f.status === "CANCELLED" && (
                      <Badge variant="secondary" dot>
                        Cancelado
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {f.status === "SCHEDULED" && f.departureAt > now && (
                      <div className="flex justify-end gap-2">
                        <EditFlightDialog flight={f} airplanes={airplanes} />
                        <CancelFlightButton flight={f} />
                      </div>
                    )}
                    {f.status === "CANCELLED" && (
                      <Button variant="secondary" size="sm" disabled>
                        Vuelo Cancelado
                      </Button>
                    )}
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
    <div className="flex min-w-[110px] flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[13px]">
          Disp: <strong>{available}</strong> / {capacity}
          <small className="ml-1 text-muted-foreground">({occupied} vendidos)</small>
        </span>
        {capacity > 0 && available === 0 && <Badge variant="destructive">Agotado</Badge>}
      </div>
      <span className="h-[5px] overflow-hidden rounded-full bg-[#EEEDF4]">
        <span
          className={cn(
            "block h-full origin-left rounded-full bg-primary motion-safe:animate-[grow_1.1s_cubic-bezier(.2,.7,.2,1)_.3s_both]",
            available === 0 && capacity > 0 && "bg-destructive",
          )}
          style={{ width: `${capacity > 0 ? ((capacity - available) / capacity) * 100 : 0}%` }}
        />
      </span>
    </div>
  );
}
