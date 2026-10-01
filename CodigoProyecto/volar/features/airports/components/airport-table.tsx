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
        <div className="rounded-md border">
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
                  <TableCell className="font-medium">
                    <span className="rounded-lg bg-muted px-2 py-1 font-mono text-[12.5px] font-medium">
                      {a.code}
                    </span>
                  </TableCell>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>{a.city}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.activeRoutesCount} trayecto(s) activo(s)
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.isActive ? "success" : "secondary"} dot>
                      {a.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-end">
                      <div className="flex flex-wrap justify-end gap-2">
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
                          <Button variant="outline" size="sm" disabled>
                            Dado de baja
                          </Button>
                        )}
                      </div>
                      {a.isActive && a.hasFutureFlights && (
                        <span className="mt-2 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                          <Lock className="size-3.5" aria-hidden />
                          Bloqueado: posee vuelos futuros programados
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
