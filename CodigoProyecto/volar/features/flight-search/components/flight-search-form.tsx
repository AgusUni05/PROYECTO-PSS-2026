"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { flightSearchSchema, type FlightSearchValues } from "../schema";

type AirportOption = { id: string; code: string; name: string; city: string };

type Props = {
  airports: AirportOption[];
  defaultValues?: Partial<FlightSearchValues>;
};

const EMPTY_VALUES: FlightSearchValues = { origen: "", destino: "", fecha: "" };

// US-13: buscador de vuelos por origen, destino y fecha (busqueda_pasajero.html).
// Valida con el mismo schema que la página de resultados y navega a /vuelos.
export function FlightSearchForm({ airports, defaultValues }: Props) {
  const router = useRouter();
  const form = useForm<FlightSearchValues>({
    resolver: zodResolver(flightSearchSchema),
    defaultValues: { ...EMPTY_VALUES, ...defaultValues },
  });
  const { errors } = form.formState;

  // Recalculado en cada render: acota el date picker nativo a hoy en adelante.
  const todayIso = new Date().toISOString().slice(0, 10);

  function onSubmit(values: FlightSearchValues) {
    router.push(`/vuelos?${new URLSearchParams(values).toString()}`);
  }

  function swapAirports() {
    const { origen, destino } = form.getValues();
    form.setValue("origen", destino);
    form.setValue("destino", origen);
    if (form.formState.isSubmitted) void form.trigger(["origen", "destino"]);
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="origen">
            Origen <span className="text-destructive">*</span>
          </Label>
          <NativeSelect id="origen" aria-invalid={!!errors.origen} {...form.register("origen")}>
            <option value="">Seleccionar origen</option>
            {airports.map((a) => (
              <option key={a.id} value={a.id}>
                {a.city} - {a.name} ({a.code})
              </option>
            ))}
          </NativeSelect>
          {errors.origen && <p className="text-xs text-destructive">{errors.origen.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="destino">
            Destino <span className="text-destructive">*</span>
          </Label>
          <NativeSelect id="destino" aria-invalid={!!errors.destino} {...form.register("destino")}>
            <option value="">Seleccionar destino</option>
            {airports.map((a) => (
              <option key={a.id} value={a.id}>
                {a.city} - {a.name} ({a.code})
              </option>
            ))}
          </NativeSelect>
          {errors.destino && <p className="text-xs text-destructive">{errors.destino.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fecha">
            Fecha de Salida <span className="text-destructive">*</span>
          </Label>
          <Input
            id="fecha"
            type="date"
            min={todayIso}
            aria-invalid={!!errors.fecha}
            {...form.register("fecha")}
          />
          {errors.fecha && <p className="text-xs text-destructive">{errors.fecha.message}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={swapAirports}>
            <ArrowLeftRight />
            Invertir Origen / Destino
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => form.reset(EMPTY_VALUES)}
          >
            Limpiar Búsqueda
          </Button>
        </div>
        <Button type="submit" size="lg">
          Buscar Vuelos Disponibles
          <ArrowRight />
        </Button>
      </div>
    </form>
  );
}
