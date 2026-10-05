import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FlightFilters as FlightFiltersValues } from "../schema";

type AirportOption = { id: string; code: string; name: string };

type Props = {
  filters: FlightFiltersValues;
  airports: AirportOption[];
};

// US-04: filtros de consulta de vuelos reales generados (GET nativo, según vuelos_admin.html).
export function FlightFilters({ filters, airports }: Props) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Filtros de Consulta</CardTitle>
        <Link
          href="/admin/vuelos"
          className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Limpiar Filtros
        </Link>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          method="GET"
          key={`${filters.fecha}-${filters.origen}-${filters.destino}-${filters.estado}`}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha de Vuelo</Label>
              <Input id="fecha" name="fecha" type="date" defaultValue={filters.fecha} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="origen">Origen</Label>
              <NativeSelect id="origen" name="origen" defaultValue={filters.origen}>
                <option value="">Todos</option>
                {airports.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="destino">Destino</Label>
              <NativeSelect id="destino" name="destino" defaultValue={filters.destino}>
                <option value="">Todos</option>
                {airports.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estado">Estado del Vuelo</Label>
              <NativeSelect id="estado" name="estado" defaultValue={filters.estado}>
                <option value="SCHEDULED">Programado</option>
                <option value="COMPLETED">Completado</option>
                <option value="CANCELLED">Cancelado</option>
                <option value="todos">Todos los estados</option>
              </NativeSelect>
            </div>
          </div>
          <div>
            <Button variant="soft" type="submit">
              Buscar Vuelos Reales
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
