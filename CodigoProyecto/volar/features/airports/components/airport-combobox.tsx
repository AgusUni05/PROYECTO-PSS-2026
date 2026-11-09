"use client";

import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import {
  airportLabel,
  airportMatches,
  selectableAirports,
  type AirportOption,
} from "../airport-search";

type Props = {
  id: string;
  airports: AirportOption[];
  /** Id del aeropuerto elegido ("" si no hay). */
  value: string;
  /** Aeropuerto elegido en el otro extremo del trayecto: no se sugiere acá. */
  excludedId: string;
  onChange: (airportId: string) => void;
  placeholder: string;
  invalid?: boolean;
};

// US-40: buscador predictivo del catálogo maestro de aeropuertos
// (catalogo_maestro.html). Se tipea el código, el nombre o la ciudad y se
// elige una sugerencia; el formulario sigue guardando solo el id.
export function AirportCombobox({ id, airports, value, excludedId, onChange, placeholder, invalid }: Props) {
  const selected = airports.find((airport) => airport.id === value) ?? null;

  return (
    <Combobox.Root
      items={selectableAirports(airports, excludedId)}
      value={selected}
      onValueChange={(airport: AirportOption | null) => onChange(airport?.id ?? "")}
      itemToStringLabel={airportLabel}
      itemToStringValue={(airport: AirportOption) => airport.id}
      isItemEqualToValue={(a: AirportOption, b: AirportOption) => a.id === b.id}
      filter={airportMatches}
    >
      <div className="relative">
        <Combobox.Input
          id={id}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          className="h-11 w-full min-w-0 rounded-lg border border-input bg-transparent py-2 pr-10 pl-3.5 text-sm transition-colors outline-none placeholder:text-muted-foreground hover:border-ring/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
        />
        <Combobox.Trigger
          aria-label="Ver aeropuertos"
          className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronDownIcon className="size-4" />
        </Combobox.Trigger>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="isolate z-50">
          <Combobox.Popup className="max-h-[min(var(--available-height),18rem)] w-(--anchor-width) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
            <Combobox.Empty className="px-2 py-2 text-sm text-muted-foreground empty:hidden">
              No hay aeropuertos que coincidan
            </Combobox.Empty>
            <Combobox.List>
              {(airport: AirportOption) => (
                <Combobox.Item
                  key={airport.id}
                  value={airport}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <span className="w-9 font-mono text-xs font-bold">{airport.code}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {airport.name} <span className="text-muted-foreground">· {airport.city}</span>
                  </span>
                  <Combobox.ItemIndicator>
                    <CheckIcon className="size-4" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
