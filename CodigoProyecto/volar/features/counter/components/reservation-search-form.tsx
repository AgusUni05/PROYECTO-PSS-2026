"use client";

import { useListNavigation } from "@/components/list-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// US-34: un único criterio de búsqueda cubre DNI, apellido o código de reserva.
export function ReservationSearchForm({ defaultValue }: { defaultValue: string }) {
  const { navigate, isPending } = useListNavigation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consulta de Reservas de Pasajeros (US-34)</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const criterio = (new FormData(event.currentTarget).get("criterio") as string) ?? "";
            navigate(`/mostrador/reservas?${new URLSearchParams({ criterio })}`);
          }}
        >
          <div className="min-w-64 flex-1 space-y-1.5">
            <Label htmlFor="criterio">Buscar por DNI, Apellido o Código de Reserva</Label>
            <Input id="criterio" name="criterio" defaultValue={defaultValue} placeholder="Ej: 32456789, Pérez o ABC123" />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Buscando…" : "Buscar Reserva (US-34)"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
