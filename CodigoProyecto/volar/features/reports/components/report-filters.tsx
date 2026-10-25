"use client";

import { ListNavLink, useFilterSubmit, useListNavigation } from "@/components/list-navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActiveRouteOption } from "@/features/routes/queries";
import type { ReportFilters as ReportFiltersValues } from "../schema";

type Props = {
  filters: ReportFiltersValues;
  routes: ActiveRouteOption[];
};

// US-27: filtros del reporte de ocupación por rango de fechas, trayecto y clase.
export function ReportFilters({ filters, routes }: Props) {
  const onSubmit = useFilterSubmit("/admin/reportes");
  const { isPending } = useListNavigation();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Filtros de Reporte (US-27)</CardTitle>
        <ListNavLink
          href="/admin/reportes"
          className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Restablecer Período
        </ListNavLink>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          method="GET"
          onSubmit={onSubmit}
          key={`${filters.desde}-${filters.hasta}-${filters.ruta}-${filters.clase}`}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="desde">Fecha Desde</Label>
              <Input id="desde" name="desde" type="date" defaultValue={filters.desde} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hasta">Fecha Hasta</Label>
              <Input id="hasta" name="hasta" type="date" defaultValue={filters.hasta} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ruta">Filtrar por Vuelo / Trayecto</Label>
              <NativeSelect id="ruta" name="ruta" defaultValue={filters.ruta}>
                <option value="">Todos los vuelos del período</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code}: {r.originCode} → {r.destinationCode}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clase">Categoría / Clase</Label>
              <NativeSelect id="clase" name="clase" defaultValue={filters.clase}>
                <option value="todas">Global (Economy + Primera)</option>
                <option value="ECONOMY">Solo Clase Economy</option>
                <option value="FIRST">Solo Primera Clase</option>
              </NativeSelect>
            </div>
          </div>
          <Button variant="soft" type="submit">
            {isPending ? "Generando…" : "Generar Métricas y Reporte (US-27)"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
