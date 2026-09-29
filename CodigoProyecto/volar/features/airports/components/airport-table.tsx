import Link from "next/link";
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
import type { AirportListItem } from "../queries";
import type { AirportFilters } from "../schema";
import { DeactivateAirportButton } from "./deactivate-airport-button";

type Props = {
  airports: AirportListItem[];
  total: number;
  page: number;
  pageCount: number;
  filters: AirportFilters;
};

// US-01: listado con filtros/paginación aplicados y acciones por fila.
export function AirportTable({ airports, total, page, pageCount, filters }: Props) {
  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.estado !== "activos") params.set("estado", filters.estado);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return `/admin/aeropuertos${qs ? `?${qs}` : ""}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aeropuertos Registrados (Total: {total})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre del Aeropuerto</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Trayectos Asociados</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {airports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Sin resultados para los filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
              {airports.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono font-medium">{a.code}</TableCell>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>{a.city}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.activeRoutesCount} trayecto(s) activo(s)
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.isActive ? "default" : "secondary"}>
                      {a.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/aeropuertos?editar=${a.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Editar
                      </Link>
                      {a.isActive ? (
                        <DeactivateAirportButton
                          id={a.id}
                          label={`${a.code} — ${a.name}`}
                          blockedReason={
                            a.hasFutureFlights
                              ? "Bloqueado: posee vuelos futuros programados"
                              : undefined
                          }
                        />
                      ) : (
                        <Button variant="secondary" size="sm" disabled>
                          Dado de baja
                        </Button>
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
