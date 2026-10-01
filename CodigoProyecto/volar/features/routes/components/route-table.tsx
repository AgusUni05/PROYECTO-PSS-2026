import Link from "next/link";
import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationLinks } from "@/components/pagination-links";
import type { RouteListItem } from "../queries";
import type { RouteFilters } from "../schema";
import { formatDays } from "../days";
import { DeactivateRouteButton } from "./deactivate-route-button";

type Props = {
  routes: RouteListItem[];
  total: number;
  page: number;
  pageCount: number;
  filters: RouteFilters;
};

// US-03: listado de trayectos con filtros/paginación aplicados y acciones por fila.
export function RouteTable({ routes, total, page, pageCount, filters }: Props) {
  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    if (filters.origen) params.set("origen", filters.origen);
    if (filters.destino) params.set("destino", filters.destino);
    if (filters.estado !== "activos") params.set("estado", filters.estado);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return `/admin/trayectos${qs ? `?${qs}` : ""}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trayectos Operativos (Total: {total})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Trayecto</TableHead>
                <TableHead>Origen &amp; Destino</TableHead>
                <TableHead>Días de Operación</TableHead>
                <TableHead>Horario Salida</TableHead>
                <TableHead>Horario Llegada</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Sin resultados para los filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
              {routes.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <span className="rounded-lg bg-muted px-2 py-1 font-mono text-[12.5px] font-medium">
                      {r.code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-lg bg-muted px-2 py-1 font-mono text-[12.5px] font-medium">
                      {r.originCode} &rarr; {r.destinationCode}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{formatDays(r.operatingDays)}</Badge>
                  </TableCell>
                  <TableCell>{r.departureTime} hs</TableCell>
                  <TableCell>
                    {r.arrivalTime} hs{" "}
                    {r.nextDayArrival && (
                      <Badge variant="secondary" className="ml-1.5">
                        +1 día
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.isActive ? "success" : "secondary"} dot>
                      {r.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex flex-wrap justify-end gap-2">
                        {r.hasSoldTickets ? (
                          <Button variant="outline" size="sm" disabled title="Bloqueado: tiene pasajes vendidos">
                            Editar
                          </Button>
                        ) : (
                          <Link
                            href={`/admin/trayectos?editar=${r.id}`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            Editar
                          </Link>
                        )}
                        {r.isActive ? (
                          <DeactivateRouteButton
                            id={r.id}
                            label={r.code}
                            blockedReason={
                              r.hasSoldTickets
                                ? "Bloqueado: existen pasajes vendidos en vuelos de este trayecto"
                                : undefined
                            }
                          />
                        ) : (
                          <Button variant="secondary" size="sm" disabled>
                            Dado de baja
                          </Button>
                        )}
                      </div>
                      {r.hasSoldTickets && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Lock className="size-3.5" aria-hidden />
                          Bloqueado: tiene pasajes vendidos
                        </span>
                      )}
                      {r.isActive && r.hasSoldTickets && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Lock className="size-3.5" aria-hidden />
                          Bloqueado: existen pasajes vendidos en vuelos de este trayecto
                        </span>
                      )}
                    </div>
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
