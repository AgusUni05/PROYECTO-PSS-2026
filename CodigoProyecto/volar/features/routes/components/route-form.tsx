"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createRouteAction, updateRouteAction } from "../actions";
import { routeFormSchema, type RouteFormValues } from "../schema";
import { DAY_LABELS, DAY_ORDER } from "../days";
import { formatDuration, isNextDayArrival } from "../time";

type AirportOption = { id: string; code: string; name: string; city: string };

type RouteFormProps = {
  airports: AirportOption[];
  editing?: { id: string; values: RouteFormValues };
};

const EMPTY_VALUES: RouteFormValues = {
  originId: "",
  destinationId: "",
  operatingDays: [],
  departureTime: "",
  arrivalTime: "",
};

// US-03: alta / modificación de trayecto (formulario del wireframe trayectos.html).
export function RouteForm({ airports, editing }: RouteFormProps) {
  const router = useRouter();
  const isEditing = !!editing;

  // Base UI's Select.Value solo resuelve la etiqueta a mostrar si el Select
  // recibe la lista de items (value/label); si no, muestra el value crudo.
  const airportItems = airports.map((a) => ({
    value: a.id,
    label: `${a.code} - ${a.city} (${a.name})`,
  }));

  const form = useForm<RouteFormValues>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: editing?.values ?? EMPTY_VALUES,
  });

  const departureTime = useWatch({ control: form.control, name: "departureTime" });
  const arrivalTime = useWatch({ control: form.control, name: "arrivalTime" });
  const durationHelp =
    departureTime && arrivalTime && departureTime !== arrivalTime
      ? `Duración estimada: ${formatDuration(departureTime, arrivalTime)}${
          isNextDayArrival(departureTime, arrivalTime) ? " (+1 día)" : " (Mismo día)"
        }`
      : null;

  async function onSubmit(values: RouteFormValues) {
    const result = isEditing
      ? await updateRouteAction(editing.id, values)
      : await createRouteAction(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            form.setError(field as keyof RouteFormValues, { message: messages[0] });
          }
        }
      }
      if (result.error) toast.error(result.error);
      return;
    }

    toast.success(isEditing ? "Trayecto actualizado" : "Trayecto creado");
    if (isEditing) {
      router.push("/admin/trayectos");
    } else {
      form.reset(EMPTY_VALUES);
    }
  }

  function handleCancel() {
    form.reset(editing?.values ?? EMPTY_VALUES);
    if (isEditing) router.push("/admin/trayectos");
  }

  return (
    <Card id="form-trayecto">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{isEditing ? "Modificar Trayecto" : "Nuevo Trayecto"}</CardTitle>
        <Badge variant={isEditing ? "default" : "secondary"}>
          {isEditing ? "Edición" : "Nuevo trayecto"}
        </Badge>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="originId">
                Aeropuerto de Origen <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={form.control}
                name="originId"
                render={({ field }) => (
                  <Select items={airportItems} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="originId" className="w-full">
                      <SelectValue placeholder="-- Seleccionar aeropuerto de salida --" />
                    </SelectTrigger>
                    <SelectContent>
                      {airports.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} - {a.city} ({a.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.originId && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.originId.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="destinationId">
                Aeropuerto de Destino <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={form.control}
                name="destinationId"
                render={({ field }) => (
                  <Select items={airportItems} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="destinationId" className="w-full">
                      <SelectValue placeholder="-- Seleccionar aeropuerto de llegada --" />
                    </SelectTrigger>
                    <SelectContent>
                      {airports.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} - {a.city} ({a.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.destinationId && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.destinationId.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Días de Operación Semanal{" "}
              <span className="text-destructive">* (Seleccioná al menos uno)</span>
            </Label>
            <Controller
              control={form.control}
              name="operatingDays"
              render={({ field }) => (
                <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border p-2.5">
                  {DAY_ORDER.map((day) => {
                    const isChecked = field.value.includes(day);
                    return (
                      <label
                        key={day}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
                          isChecked && "border-primary bg-primary font-semibold text-primary-foreground",
                        )}
                      >
                        <Checkbox
                          className="sr-only"
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            field.onChange(
                              checked
                                ? [...field.value, day]
                                : field.value.filter((d) => d !== day),
                            );
                          }}
                        />
                        {DAY_LABELS[day]}
                      </label>
                    );
                  })}
                </div>
              )}
            />
            {form.formState.errors.operatingDays && (
              <p className="text-xs text-destructive">
                {form.formState.errors.operatingDays.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="departureTime">
                Horario de Partida <span className="text-destructive">*</span>
              </Label>
              <Input
                id="departureTime"
                type="time"
                aria-invalid={!!form.formState.errors.departureTime}
                {...form.register("departureTime")}
              />
              {form.formState.errors.departureTime && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.departureTime.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arrivalTime">
                Horario de Llegada <span className="text-destructive">*</span>
              </Label>
              <Input
                id="arrivalTime"
                type="time"
                aria-invalid={!!form.formState.errors.arrivalTime}
                {...form.register("arrivalTime")}
              />
              {form.formState.errors.arrivalTime ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.arrivalTime.message}
                </p>
              ) : (
                durationHelp && (
                  <span className="text-[11.5px] text-muted-foreground">{durationHelp}</span>
                )
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Guardando…" : "Guardar Trayecto"}
            </Button>
            <Button type="button" variant="soft" onClick={() => form.reset()}>
              Limpiar Campos
            </Button>
            <Button type="button" variant="ghost" onClick={handleCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
