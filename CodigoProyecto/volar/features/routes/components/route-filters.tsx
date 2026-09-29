import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RouteFilters as RouteFiltersValues } from "../schema";

type AirportOption = { id: string; code: string; name: string };

type Props = {
  filters: RouteFiltersValues;
  airports: AirportOption[];
};

// US-03: filtros de búsqueda por origen/destino (GET nativo, según trayectos.html).
export function RouteFilters({ filters, airports }: Props) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Filtrar Trayectos</CardTitle>
        <Link
          href="/admin/trayectos"
          className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Limpiar Filtros
        </Link>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-3" method="GET">
          <div className="space-y-1.5">
            <Label htmlFor="origen">Filtrar por Origen</Label>
            <NativeSelect id="origen" name="origen" defaultValue={filters.origen}>
              <option value="">Todos los orígenes</option>
              {airports.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} - {a.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="destino">Filtrar por Destino</Label>
            <NativeSelect id="destino" name="destino" defaultValue={filters.destino}>
              <option value="">Todos los destinos</option>
              {airports.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} - {a.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Filtrar Trayectos
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
