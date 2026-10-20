"use client";

import { ListNavLink, useFilterSubmit, useListNavigation } from "@/components/list-navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StaffFilters as StaffFiltersValues } from "../schema";

type Props = {
  filters: StaffFiltersValues;
  summary: { activeAdmins: number; activeAgents: number; inactive: number };
};

// US-31: filtros del listado de personal y resumen (gestion_personal.html).
export function StaffFilters({ filters, summary }: Props) {
  const onSubmit = useFilterSubmit("/admin/personal");
  const { isPending } = useListNavigation();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Filtrar Cuentas de Personal</CardTitle>
        <ListNavLink
          href="/admin/personal"
          className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Restablecer
        </ListNavLink>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          className="space-y-4"
          method="GET"
          onSubmit={onSubmit}
          key={`${filters.q}-${filters.rol}-${filters.estado}`}
        >
          <div className="space-y-1.5">
            <Label htmlFor="q">Buscar por Nombre o Email</Label>
            <Input id="q" name="q" defaultValue={filters.q} placeholder="Ingresar texto a buscar..." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rol">Filtrar por Rol</Label>
              <NativeSelect id="rol" name="rol" defaultValue={filters.rol}>
                <option value="todos">Todos los roles</option>
                <option value="ADMIN">Administradores</option>
                <option value="COUNTER_AGENT">Empleados de Mostrador</option>
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estado">Estado de la Cuenta</Label>
              <NativeSelect id="estado" name="estado" defaultValue={filters.estado}>
                <option value="todos">Todos</option>
                <option value="activos">Solo activas</option>
                <option value="inactivos">Solo deshabilitadas</option>
              </NativeSelect>
            </div>
          </div>
          <Button type="submit" variant="soft" className="w-full" disabled={isPending}>
            {isPending ? "Aplicando…" : "Aplicar Filtros"}
          </Button>
        </form>

        <div className="rounded-xl bg-muted p-4 text-sm">
          <b className="mb-1 block">Resumen del personal</b>
          <ul className="space-y-0.5 text-muted-foreground">
            <li>• {summary.activeAdmins} administrador(es) activo(s)</li>
            <li>• {summary.activeAgents} empleado(s) de mostrador activo(s)</li>
            <li>• {summary.inactive} cuenta(s) deshabilitada(s)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
