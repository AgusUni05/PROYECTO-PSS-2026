"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateFlightsAction } from "../actions";
import { generateFlightsFormSchema, type GenerateFlightsFormValues } from "../schema";
import { matchingDates } from "../generation";
import { formatDays } from "@/features/routes/days";
import type { ActiveRouteOption } from "@/features/routes/queries";
import type { ActiveAirplaneOption } from "@/features/airplanes/queries";

type Props = {
  routes: ActiveRouteOption[];
  airplanes: ActiveAirplaneOption[];
};

const EMPTY_VALUES: GenerateFlightsFormValues = {
  routeId: "",
  airplaneId: "",
  startDate: "",
  endDate: "",
  economyCapacity: 0,
  firstClassCapacity: 0,
  economyFare: 0,
  firstClassFare: 0,
};

// US-04/US-07: generador masivo de vuelos reales (formulario del wireframe vuelos_admin.html).
export function GenerateFlightsForm({ routes, airplanes }: Props) {
  const form = useForm<GenerateFlightsFormValues>({
    resolver: zodResolver(generateFlightsFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const routeItems = routes.map((r) => ({
    value: r.id,
    label: `${r.code}: ${r.originCode} → ${r.destinationCode} [${formatDays(r.operatingDays)} - ${r.departureTime}]`,
  }));
  const airplaneItems = airplanes.map((a) => ({
    value: a.id,
    label: `${a.identifier} (${a.model} - ${a.economySeats} Eco / ${a.firstClassSeats} First)`,
  }));

  const routeId = useWatch({ control: form.control, name: "routeId" });
  const startDate = useWatch({ control: form.control, name: "startDate" });
  const endDate = useWatch({ control: form.control, name: "endDate" });

  const selectedRoute = routes.find((r) => r.id === routeId);
  const preview =
    selectedRoute && startDate && endDate && endDate >= startDate
      ? matchingDates(startDate, endDate, selectedRoute.operatingDays).length
      : null;

  async function onSubmit(values: GenerateFlightsFormValues) {
    const result = await generateFlightsAction(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            form.setError(field as keyof GenerateFlightsFormValues, { message: messages[0] });
          }
        }
      }
      if (result.error) toast.error(result.error);
      return;
    }

    toast.success(`Se generaron ${result.data.count} vuelo(s) reales.`);
    form.reset(EMPTY_VALUES);
  }

  function handleAirplaneChange(airplaneId: string | null, onChange: (value: string) => void) {
    onChange(airplaneId ?? "");
    const airplane = airplanes.find((a) => a.id === airplaneId);
    if (airplane) {
      form.setValue("economyCapacity", airplane.economySeats);
      form.setValue("firstClassCapacity", airplane.firstClassSeats);
    }
  }

  return (
    <Card id="form-generador">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Programar Vuelos desde Trayecto y Período</CardTitle>
        <Badge variant="secondary">Generador Masivo</Badge>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <fieldset className="space-y-4 rounded-md border p-4">
            <legend className="px-1 text-sm font-semibold">
              1. Trayecto y Período de Disponibilidad (US-07)
            </legend>

            <div className="space-y-1.5">
              <Label htmlFor="routeId">
                Seleccionar Trayecto Base <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={form.control}
                name="routeId"
                render={({ field }) => (
                  <Select items={routeItems} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="routeId" className="w-full">
                      <SelectValue placeholder="-- Seleccionar trayecto --" />
                    </SelectTrigger>
                    <SelectContent>
                      {routes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.code}: {r.originCode} → {r.destinationCode} [{formatDays(r.operatingDays)} -{" "}
                          {r.departureTime}]
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.routeId && (
                <p className="text-xs text-destructive">{form.formState.errors.routeId.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">
                  Fecha Inicio de Venta / Vuelos <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  aria-invalid={!!form.formState.errors.startDate}
                  {...form.register("startDate")}
                />
                {form.formState.errors.startDate && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.startDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">
                  Fecha Fin de Venta / Vuelos <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  aria-invalid={!!form.formState.errors.endDate}
                  {...form.register("endDate")}
                />
                {form.formState.errors.endDate && (
                  <p className="text-xs text-destructive">{form.formState.errors.endDate.message}</p>
                )}
              </div>
            </div>

            {preview !== null && (
              <p className="text-xs text-muted-foreground">
                {preview > 0
                  ? `Se van a generar ${preview} vuelo(s) reales para este período.`
                  : "Ninguna fecha del período coincide con los días de operación del trayecto."}
              </p>
            )}
          </fieldset>

          <fieldset className="space-y-4 rounded-md border p-4">
            <legend className="px-1 text-sm font-semibold">
              2. Aeronave y Capacidad por Clase (US-09)
            </legend>

            <div className="space-y-1.5">
              <Label htmlFor="airplaneId">
                Asignar Avión de la Flota <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={form.control}
                name="airplaneId"
                render={({ field }) => (
                  <Select
                    items={airplaneItems}
                    value={field.value}
                    onValueChange={(v) => handleAirplaneChange(v, field.onChange)}
                  >
                    <SelectTrigger id="airplaneId" className="w-full">
                      <SelectValue placeholder="-- Seleccionar avión --" />
                    </SelectTrigger>
                    <SelectContent>
                      {airplanes.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.identifier} ({a.model} - {a.economySeats} Eco / {a.firstClassSeats} First)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.airplaneId && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.airplaneId.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="economyCapacity">
                  Capacidad Asientos Economy <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="economyCapacity"
                  type="number"
                  min={0}
                  aria-invalid={!!form.formState.errors.economyCapacity}
                  {...form.register("economyCapacity", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="firstClassCapacity">
                  Capacidad Asientos Primera Clase <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstClassCapacity"
                  type="number"
                  min={0}
                  aria-invalid={!!form.formState.errors.firstClassCapacity}
                  {...form.register("firstClassCapacity", { valueAsNumber: true })}
                />
              </div>
            </div>
            {form.formState.errors.economyCapacity && (
              <p className="text-xs text-destructive">
                {form.formState.errors.economyCapacity.message}
              </p>
            )}
          </fieldset>

          <fieldset className="space-y-4 rounded-md border p-4">
            <legend className="px-1 text-sm font-semibold">3. Tarifas por Clase (US-11)</legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="economyFare">
                  Precio Tarifa Economy ($ ARS) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="economyFare"
                  type="number"
                  min={1}
                  placeholder="Ej: 45000"
                  aria-invalid={!!form.formState.errors.economyFare}
                  {...form.register("economyFare", { valueAsNumber: true })}
                />
                {form.formState.errors.economyFare && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.economyFare.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="firstClassFare">
                  Precio Tarifa Primera Clase ($ ARS) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstClassFare"
                  type="number"
                  min={1}
                  placeholder="Ej: 95000"
                  aria-invalid={!!form.formState.errors.firstClassFare}
                  {...form.register("firstClassFare", { valueAsNumber: true })}
                />
                {form.formState.errors.firstClassFare && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.firstClassFare.message}
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Generando…" : "Generar y Publicar Vuelos Reales"}
            </Button>
            <Button type="button" variant="outline" onClick={() => form.reset(EMPTY_VALUES)}>
              Restablecer Formulario
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
