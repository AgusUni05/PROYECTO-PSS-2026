"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateFlightAction } from "../actions";
import { editFlightFormSchema, type EditFlightFormValues } from "../schema";
import { formatDate } from "../format";
import type { FlightListItem } from "../queries";

type EditableFlight = Pick<
  FlightListItem,
  | "id"
  | "code"
  | "date"
  | "originCode"
  | "destinationCode"
  | "economyCapacity"
  | "economyOccupied"
  | "firstClassCapacity"
  | "firstClassOccupied"
  | "airplaneIdentifier"
  | "airplaneEconomySeats"
  | "airplaneFirstClassSeats"
  | "economyFare"
  | "firstClassFare"
>;

// US-09/US-11: edición puntual de capacidad y tarifas de un vuelo generado (modal del wireframe vuelos_admin.html).
export function EditFlightDialog({ flight }: { flight: EditableFlight }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Editar Vuelo</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Vuelo {flight.code}</DialogTitle>
          <DialogDescription>
            Parámetros operativos para el {formatDate(flight.date)} ({flight.originCode} →{" "}
            {flight.destinationCode}). El cambio afecta solo a esta fecha.
          </DialogDescription>
        </DialogHeader>
        {/* El form vive dentro del popup: se monta al abrir, con los valores vigentes. */}
        <EditFlightForm flight={flight} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function EditFlightForm({ flight, onSaved }: { flight: EditableFlight; onSaved: () => void }) {
  const form = useForm<EditFlightFormValues>({
    resolver: zodResolver(editFlightFormSchema),
    defaultValues: {
      economyCapacity: flight.economyCapacity,
      firstClassCapacity: flight.firstClassCapacity,
      economyFare: Number(flight.economyFare),
      firstClassFare: Number(flight.firstClassFare),
    },
  });
  const { errors } = form.formState;

  async function onSubmit(values: EditFlightFormValues) {
    const result = await updateFlightAction(flight.id, values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            form.setError(field as keyof EditFlightFormValues, { message: messages[0] });
          }
        }
      }
      if (result.error) toast.error(result.error);
      return;
    }

    toast.success(`Vuelo ${flight.code} actualizado`);
    onSaved();
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="edit-economyCapacity">Capacidad Economy (US-09)</Label>
          <Input
            id="edit-economyCapacity"
            type="number"
            min={flight.economyOccupied}
            max={flight.airplaneEconomySeats}
            aria-invalid={!!errors.economyCapacity}
            {...form.register("economyCapacity", { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">
            Mín: {flight.economyOccupied} (vendidos) · Máx: {flight.airplaneEconomySeats} (avión)
          </p>
          {errors.economyCapacity && (
            <p className="text-xs text-destructive">{errors.economyCapacity.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-economyFare">Tarifa Economy $ (US-11)</Label>
          <Input
            id="edit-economyFare"
            type="number"
            min={0.01}
            step={0.01}
            aria-invalid={!!errors.economyFare}
            {...form.register("economyFare", { valueAsNumber: true })}
          />
          {errors.economyFare && (
            <p className="text-xs text-destructive">{errors.economyFare.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-firstClassCapacity">Capacidad Primera (US-09)</Label>
          <Input
            id="edit-firstClassCapacity"
            type="number"
            min={flight.firstClassOccupied}
            max={flight.airplaneFirstClassSeats}
            aria-invalid={!!errors.firstClassCapacity}
            {...form.register("firstClassCapacity", { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">
            Mín: {flight.firstClassOccupied} (vendidos) · Máx: {flight.airplaneFirstClassSeats}{" "}
            (avión)
          </p>
          {errors.firstClassCapacity && (
            <p className="text-xs text-destructive">{errors.firstClassCapacity.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-firstClassFare">Tarifa Primera $ (US-11)</Label>
          <Input
            id="edit-firstClassFare"
            type="number"
            min={0.01}
            step={0.01}
            aria-invalid={!!errors.firstClassFare}
            {...form.register("firstClassFare", { valueAsNumber: true })}
          />
          {errors.firstClassFare && (
            <p className="text-xs text-destructive">{errors.firstClassFare.message}</p>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Una tarifa nueva aplica a las compras futuras; las ventas ya confirmadas conservan el precio
        pagado.
      </p>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cerrar / Descartar
        </DialogClose>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Guardando…" : "Guardar Cambios de Vuelo"}
        </Button>
      </DialogFooter>
    </form>
  );
}
