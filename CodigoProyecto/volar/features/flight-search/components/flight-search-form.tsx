"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeftRight, CalendarDays, MapPin, Search } from "lucide-react";
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
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_210px_auto] gap-0 rounded-[22px] bg-card p-2.5 shadow-[0_30px_70px_-30px_rgba(22,19,61,0.45),0_2px_6px_rgba(22,19,61,0.06)]">
        <div className="group flex flex-col justify-center gap-1 rounded-2xl px-5 py-3 transition-colors hover:bg-muted focus-within:bg-secondary">
          <Label htmlFor="origen" className="gap-1.5 text-[11px] font-bold tracking-[0.09em] text-muted-foreground uppercase">
            <MapPin className="size-3.5 text-primary" />
            Origen <span className="text-primary">*</span>
          </Label>
          <NativeSelect
            id="origen"
            aria-invalid={!!errors.origen}
            className="h-auto cursor-pointer border-0 bg-transparent p-0 text-base font-bold"
            {...form.register("origen")}
          >
            <option value="">Seleccionar origen</option>
            {airports.map((a) => (
              <option key={a.id} value={a.id}>
                {a.city} - {a.name} ({a.code})
              </option>
            ))}
          </NativeSelect>
          {errors.origen && <p className="text-xs text-destructive">{errors.origen.message}</p>}
        </div>

        <div className="group relative flex flex-col justify-center gap-1 rounded-2xl py-3 pr-5 pl-[34px] transition-colors before:absolute before:top-4 before:bottom-4 before:left-0 before:w-px before:bg-border hover:bg-muted focus-within:bg-secondary">
          <button
            type="button"
            onClick={swapAirports}
            aria-label="Invertir origen y destino"
            className="absolute top-1/2 left-[-19px] z-10 grid size-[38px] -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-primary transition-[transform,box-shadow,border-color] duration-500 hover:-translate-y-1/2 hover:rotate-180 hover:border-primary hover:shadow-[0_8px_20px_-8px_rgba(85,48,224,0.6)]"
          >
            <ArrowLeftRight className="size-4" />
          </button>
          <Label htmlFor="destino" className="gap-1.5 text-[11px] font-bold tracking-[0.09em] text-muted-foreground uppercase">
            <MapPin className="size-3.5 text-primary" />
            Destino <span className="text-primary">*</span>
          </Label>
          <NativeSelect
            id="destino"
            aria-invalid={!!errors.destino}
            className="h-auto cursor-pointer border-0 bg-transparent p-0 text-base font-bold"
            {...form.register("destino")}
          >
            <option value="">Seleccionar destino</option>
            {airports.map((a) => (
              <option key={a.id} value={a.id}>
                {a.city} - {a.name} ({a.code})
              </option>
            ))}
          </NativeSelect>
          {errors.destino && <p className="text-xs text-destructive">{errors.destino.message}</p>}
        </div>

        <div className="group relative flex flex-col justify-center gap-1 rounded-2xl px-5 py-3 transition-colors before:absolute before:top-4 before:bottom-4 before:left-0 before:w-px before:bg-border hover:bg-muted focus-within:bg-secondary">
          <Label htmlFor="fecha" className="gap-1.5 text-[11px] font-bold tracking-[0.09em] text-muted-foreground uppercase">
            <CalendarDays className="size-3.5 text-primary" />
            Salida <span className="text-primary">*</span>
          </Label>
          <Input
            id="fecha"
            type="date"
            min={todayIso}
            aria-invalid={!!errors.fecha}
            className="h-auto border-0 bg-transparent p-0 text-base font-bold"
            {...form.register("fecha")}
          />
          {errors.fecha && <p className="text-xs text-destructive">{errors.fecha.message}</p>}
        </div>

        <Button type="submit" className="ml-1.5 h-auto min-h-16 rounded-2xl px-[30px] text-base">
          <Search className="size-[18px]" />
          Buscar vuelos
        </Button>
      </div>

      <div className="flex items-center justify-between px-2 pt-[18px] text-[13px] text-muted-foreground">
        <span>
          <span className="text-primary">*</span> Campos obligatorios
        </span>
        <Button type="button" variant="link" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => form.reset(EMPTY_VALUES)}>
          <ArrowLeftRight className="size-3.5" />
          Limpiar búsqueda
        </Button>
      </div>
    </form>
  );
}
