"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Pencil } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
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
import { formatDate, formatTime } from "../format";
import type { FlightListItem } from "../queries";
import type { ActiveAirplaneOption } from "@/features/airplanes/queries";

type EditableFlight = Pick<
  FlightListItem,
  | "id"
  | "code"
  | "date"
  | "departureAt"
  | "arrivalAt"
  | "originCode"
  | "destinationCode"
  | "airplaneId"
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

// US-05/US-09/US-11/US-12: edición puntual de un vuelo generado (modal del wireframe vuelos_admin.html).
export function EditFlightDialog({
  flight,
  airplanes,
}: {
  flight: EditableFlight;
  airplanes: ActiveAirplaneOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Editar Vuelo</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="flex-row items-start gap-3.5 space-y-0">
          <span className="grid size-[42px] flex-none place-items-center rounded-xl bg-secondary text-primary">
            <Pencil className="size-5" />
          </span>
          <div>
            <DialogTitle>Editar Vuelo {flight.code}</DialogTitle>
            <DialogDescription>
              Parámetros operativos para el {formatDate(flight.date)} ({flight.originCode} →{" "}
              {flight.destinationCode}). El cambio afecta solo a esta fecha.
            </DialogDescription>
          </div>
        </DialogHeader>
        {/* El form vive dentro del popup: se monta al abrir, con los valores vigentes. */}
        <EditFlightForm
          flight={flight}
          airplanes={airplanes}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditFlightForm({
  flight,
  airplanes,
  onSaved,
}: {
  flight: EditableFlight;
  airplanes: ActiveAirplaneOption[];
  onSaved: () => void;
}) {
  const form = useForm<EditFlightFormValues>({
    resolver: zodResolver(editFlightFormSchema),
    defaultValues: {
      economyCapacity: flight.economyCapacity,
      firstClassCapacity: flight.firstClassCapacity,
      economyFare: Number(flight.economyFare),
      firstClassFare: Number(flight.firstClassFare),
      airplaneId: flight.airplaneId,
      departureTime: formatTime(flight.departureAt),
      arrivalTime: formatTime(flight.arrivalAt),
    },
  });
  const { errors } = form.formState;

  // El avión actual puede no estar entre los activos (p. ej. dado de baja):
  // se agrega igual para no perder la referencia al abrir el modal.
  const airplaneOptions = airplanes.some((a) => a.id === flight.airplaneId)
    ? airplanes
    : [
        {
          id: flight.airplaneId,
          identifier: flight.airplaneIdentifier,
          model: "",
          economySeats: flight.airplaneEconomySeats,
          firstClassSeats: flight.airplaneFirstClassSeats,
        },
        ...airplanes,
      ];

  const airplaneId = useWatch({ control: form.control, name: "airplaneId" });
  const selectedAirplane = airplaneOptions.find((a) => a.id === airplaneId) ?? airplaneOptions[0];

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
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {/* US-05: ajuste operativo de horario y aeronave */}
      <fieldset className="space-y-4 rounded-xl border border-border p-4">
        <legend className="px-1.5 text-[13px] font-bold">
          1. Ajuste operativo de horario y aeronave
        </legend>

        <div className="space-y-1.5">
          <Label htmlFor="edit-airplaneId">Aeronave asignada</Label>
          <NativeSelect
            id="edit-airplaneId"
            aria-invalid={!!errors.airplaneId}
            {...form.register("airplaneId")}
          >
            {airplaneOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.identifier}
                {a.model ? ` (${a.model})` : ""} - {a.economySeats} Eco / {a.firstClassSeats} First
              </option>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground">
            No se puede asignar un avión con menos capacidad que los pasajes vendidos.
          </p>
          {errors.airplaneId && (
            <p className="text-xs text-destructive">{errors.airplaneId.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-departureTime">Nuevo horario de partida</Label>
            <Input
              id="edit-departureTime"
              type="time"
              aria-invalid={!!errors.departureTime}
              {...form.register("departureTime")}
            />
            <p className="text-xs text-muted-foreground">
              Original: {formatTime(flight.departureAt)}
            </p>
            {errors.departureTime && (
              <p className="text-xs text-destructive">{errors.departureTime.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-arrivalTime">Nuevo horario de llegada</Label>
            <Input
              id="edit-arrivalTime"
              type="time"
              aria-invalid={!!errors.arrivalTime}
              {...form.register("arrivalTime")}
            />
            <p className="text-xs text-muted-foreground">
              Original: {formatTime(flight.arrivalAt)}
            </p>
            {errors.arrivalTime && (
              <p className="text-xs text-destructive">{errors.arrivalTime.message}</p>
            )}
          </div>
        </div>
      </fieldset>

      {/* US-09/US-11/US-12: capacidad y tarifas */}
      <fieldset className="space-y-4 rounded-xl border border-border p-4">
        <legend className="px-1.5 text-[13px] font-bold">
          2. Capacidad y tarifas comerciales
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-economyCapacity">Capacidad Economy</Label>
            <Input
              id="edit-economyCapacity"
              type="number"
              min={flight.economyOccupied}
              max={selectedAirplane.economySeats}
              aria-invalid={!!errors.economyCapacity}
              {...form.register("economyCapacity", { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              Mín: {flight.economyOccupied} (vendidos) · Máx: {selectedAirplane.economySeats}{" "}
              (avión)
            </p>
            {errors.economyCapacity && (
              <p className="text-xs text-destructive">{errors.economyCapacity.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-economyFare">Tarifa Economy $</Label>
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
            <Label htmlFor="edit-firstClassCapacity">Capacidad Primera</Label>
            <Input
              id="edit-firstClassCapacity"
              type="number"
              min={flight.firstClassOccupied}
              max={selectedAirplane.firstClassSeats}
              aria-invalid={!!errors.firstClassCapacity}
              {...form.register("firstClassCapacity", { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              Mín: {flight.firstClassOccupied} (vendidos) · Máx: {selectedAirplane.firstClassSeats}{" "}
              (avión)
            </p>
            {errors.firstClassCapacity && (
              <p className="text-xs text-destructive">{errors.firstClassCapacity.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-firstClassFare">Tarifa Primera $</Label>
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

        <p className="flex items-start gap-2.5 rounded-xl bg-muted p-3.5 text-[13px] leading-[1.55] text-muted-foreground">
          <Info className="mt-0.5 size-4 flex-none text-primary" />
          Si el vuelo tiene pasajes vendidos, un cambio de horario dispara la notificación de
          contingencia a los pasajeros. Una tarifa nueva aplica a las compras futuras; las ventas ya
          confirmadas conservan el precio pagado.
        </p>
      </fieldset>

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
