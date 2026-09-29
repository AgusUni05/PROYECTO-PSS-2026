import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AirplaneFilters as AirplaneFiltersValues } from "../schema";

type Props = {
  filters: AirplaneFiltersValues;
  summary: { activeCount: number; averageCapacity: number };
};

// US-02: filtros de búsqueda y resumen de flota (GET nativo, según aviones.html).
export function AirplaneFilters({ filters, summary }: Props) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Filtros</CardTitle>
        <Link
          href="/admin/aviones"
          className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Restablecer
        </Link>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="space-y-4"
          method="GET"
          key={`${filters.q}-${filters.estado}-${filters.config}`}
        >
          <div className="space-y-1.5">
            <Label htmlFor="q">Buscar por Identificador o Modelo</Label>
            <Input id="q" name="q" defaultValue={filters.q} placeholder="Ej: Boeing, LV-ARG..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="config">Configuración de Clases</Label>
            <NativeSelect id="config" name="config" defaultValue={filters.config}>
              <option value="todas">Todas las configuraciones</option>
              <option value="mixto">Con Economy y Primera Clase</option>
              <option value="economy">Solo Economy</option>
            </NativeSelect>
          </div>
          <Button type="submit" className="w-full">
            Buscar Aviones
          </Button>
        </form>
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="font-medium">Resumen Rápido</p>
          <p className="mt-1 text-muted-foreground">
            {summary.activeCount} aeronave(s) registrada(s) activa(s)
          </p>
          <p className="text-muted-foreground">
            Capacidad promedio: {summary.averageCapacity} asientos por aeronave
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
