import { CheckCircle2 } from "lucide-react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDays } from "@/features/routes/days";
import type { ActiveRouteOption } from "@/features/routes/queries";
import type { ActiveAirplaneOption } from "@/features/airplanes/queries";
import { matchingDates } from "../generation";
import type { GenerateFlightsFormValues } from "../schema";

type FormSectionProps = {
  form: UseFormReturn<GenerateFlightsFormValues>;
};

export function RoutePeriodSection({
  form,
  routes,
}: FormSectionProps & { routes: ActiveRouteOption[] }) {
  const routeId = useWatch({ control: form.control, name: "routeId" });
  const startDate = useWatch({ control: form.control, name: "startDate" });
  const endDate = useWatch({ control: form.control, name: "endDate" });
  const selectedRoute = routes.find((route) => route.id === routeId);
  const preview =
    selectedRoute && startDate && endDate && endDate >= startDate
      ? matchingDates(startDate, endDate, selectedRoute.operatingDays).length
      : null;
  const todayIso = new Date().toISOString().slice(0, 10);

  const routeItems = routes.map((route) => ({
    value: route.id,
    label: `${route.code}: ${route.originCode} → ${route.destinationCode} [${formatDays(route.operatingDays)} - ${route.departureTime}]`,
  }));

  return (
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
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.code}: {route.originCode} → {route.destinationCode} [
                      {formatDays(route.operatingDays)} - {route.departureTime}]
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
              Fecha de Inicio del Trayecto <span className="text-destructive">*</span>
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
              Fecha de Fin del Trayecto <span className="text-destructive">*</span>
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
        <span className="block text-[11.5px] text-muted-foreground">
          Este rango solo define qué vuelos se generan. La compra de pasajes de cada vuelo se
          habilita automáticamente desde que se crea hasta el momento en que sale.
        </span>

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
  );
}

export function AirplaneCapacitySection({
  form,
  airplanes,
}: FormSectionProps & { airplanes: ActiveAirplaneOption[] }) {
  const airplaneItems = airplanes.map((airplane) => ({
    value: airplane.id,
    label: `${airplane.identifier} (${airplane.model} - ${airplane.economySeats} Eco / ${airplane.firstClassSeats} First)`,
  }));

  function handleAirplaneChange(airplaneId: string | null, onChange: (value: string) => void) {
    onChange(airplaneId ?? "");
    const airplane = airplanes.find((item) => item.id === airplaneId);
    if (airplane) {
      form.setValue("economyCapacity", airplane.economySeats);
      form.setValue("firstClassCapacity", airplane.firstClassSeats);
    }
  }

  return (
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
                onValueChange={(value) => handleAirplaneChange(value, field.onChange)}
              >
                <SelectTrigger id="airplaneId" className="w-full">
                  <SelectValue placeholder="-- Seleccionar avión --" />
                </SelectTrigger>
                <SelectContent>
                  {airplanes.map((airplane) => (
                    <SelectItem key={airplane.id} value={airplane.id}>
                      {airplane.identifier} ({airplane.model} - {airplane.economySeats} Eco / {airplane.firstClassSeats} First)
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
  );
}

export function FaresSection({ form }: FormSectionProps) {
  return (
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
              className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
              className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
  );
}
