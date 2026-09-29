import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { AirplaneListItem } from "../queries";
import type { AirplaneFilters } from "../schema";
import { DeactivateAirplaneButton } from "./deactivate-airplane-button";

type Props = {
  airplanes: AirplaneListItem[];
  total: number;
  page: number;
  pageCount: number;
  filters: AirplaneFilters;
};

// US-02: listado de flota con filtros/paginación aplicados y acciones por fila.
export function AirplaneTable({ airplanes, total, page, pageCount, filters }: Props) {
  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.estado !== "activos") params.set("estado", filters.estado);
    if (filters.config !== "todas") params.set("config", filters.config);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return `/admin/aviones${qs ? `?${qs}` : ""}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flota de Aviones (Total: {total})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identificador</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Asientos Economy</TableHead>
                <TableHead>Asientos Primera</TableHead>
                <TableHead>Capacidad Total</TableHead>
                <TableHead>Vuelos Asignados</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {airplanes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Sin resultados para los filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
              {airplanes.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono font-medium">{a.identifier}</TableCell>
                  <TableCell>{a.model}</TableCell>
                  <TableCell>{a.economySeats}</TableCell>
                  <TableCell>{a.firstClassSeats}</TableCell>
                  <TableCell className="font-medium">
                    {a.economySeats + a.firstClassSeats}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.futureFlightsCount} vuelo(s) futuro(s)
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/aviones?editar=${a.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Editar Capacidad
                      </Link>
                      {a.isActive ? (
                        <DeactivateAirplaneButton
                          id={a.id}
                          label={`${a.identifier} — ${a.model}`}
                          blockedReason={
                            a.futureFlightsCount > 0
                              ? `Bloqueado: posee ${a.futureFlightsCount} vuelo(s) futuro(s) asignado(s)`
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
