"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
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

  // Recalculado en cada render: acota los date pickers nativos a hoy en adelante.
  const todayIso = new Date().toISOString().slice(0, 10);

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
          <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-[18px] border-t border-border py-[22px] first:border-t-0 first:pt-1">
            <span className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-extrabold text-[#4320C7]">
              1
            </span>
            <div className="space-y-4">
            <div className="mb-4 flex items-baseline gap-2.5">
              <h3 className="text-[15px] font-extrabold">Trayecto y período de disponibilidad</h3>
            </div>

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
                  min={todayIso}
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
                  min={startDate || todayIso}
                  aria-invalid={!!form.formState.errors.endDate}
                  {...form.register("endDate")}
                />
                {form.formState.errors.endDate && (
                  <p className="text-xs text-destructive">{form.formState.errors.endDate.message}</p>
                )}
              </div>
            </div>

            {preview !== null &&
              (preview > 0 ? (
                <span className="mt-3 flex items-center gap-2 rounded-xl bg-success-muted px-3.5 py-2.5 text-[12.5px] font-semibold text-success">
                  <CheckCircle2 className="size-4" />
                  {`Se van a generar ${preview} vuelo(s) reales para este período.`}
                </span>
              ) : (
                <span className="mt-3 text-[11.5px] text-muted-foreground">
                  Ninguna fecha del período coincide con los días de operación del trayecto.
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-[18px] border-t border-border py-[22px] first:border-t-0 first:pt-1">
            <span className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-extrabold text-[#4320C7]">
              2
            </span>
            <div className="space-y-4">
            <div className="mb-4 flex items-baseline gap-2.5">
              <h3 className="text-[15px] font-extrabold">Aeronave y capacidad por clase</h3>
            </div>

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
            {form.formState.errors.firstClassCapacity && (
              <p className="text-xs text-destructive">
                {form.formState.errors.firstClassCapacity.message}
              </p>
            )}
            </div>
          </div>

          <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-[18px] border-t border-border py-[22px] first:border-t-0 first:pt-1">
            <span className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-extrabold text-[#4320C7]">
              3
            </span>
            <div className="space-y-4">
            <div className="mb-4 flex items-baseline gap-2.5">
              <h3 className="text-[15px] font-extrabold">Tarifas por clase</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="economyFare">
                  Precio Tarifa Economy ($ ARS) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="economyFare"
                  type="number"
                  min={0.01}
                  step={0.01}
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
                  min={0.01}
                  step={0.01}
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
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => form.reset(EMPTY_VALUES)}>
              Restablecer Formulario
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Generando…" : "Generar y Publicar Vuelos Reales"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
