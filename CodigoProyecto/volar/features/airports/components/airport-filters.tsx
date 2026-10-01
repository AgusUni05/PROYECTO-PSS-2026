import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AirportFilters as AirportFiltersValues } from "../schema";

// US-01: filtros de búsqueda (GET nativo, sin JS) según aeropuertos.html.
export function AirportFilters({ filters }: { filters: AirportFiltersValues }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Filtros de Búsqueda</CardTitle>
        <Link
          href="/admin/aeropuertos"
          className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Restablecer
        </Link>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" method="GET" key={`${filters.q}-${filters.estado}`}>
          <div className="space-y-1.5">
            <Label htmlFor="q">Buscar por Código, Nombre o Ciudad</Label>
            <Input
              id="q"
              name="q"
              defaultValue={filters.q}
              placeholder="Ingresar texto a buscar..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estado">Estado Operativo</Label>
            <NativeSelect id="estado" name="estado" defaultValue={filters.estado}>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos / Dados de baja</option>
              <option value="todos">Todos los estados</option>
            </NativeSelect>
          </div>
          <Button type="submit" variant="soft" className="w-full">
            Aplicar Filtros
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
