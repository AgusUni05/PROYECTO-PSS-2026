import type { Metadata } from "next";
import { ListNavigationProvider, ListResults } from "@/components/list-navigation";
import { FlightSearchForm } from "@/features/flight-search/components/flight-search-form";
import { FlightResultCard } from "@/features/flight-search/components/flight-result-card";
import { FlightResultsSkeleton } from "@/features/flight-search/components/flight-search-skeleton";
import { flightSearchSchema, type FlightSearchValues } from "@/features/flight-search/schema";
import { searchFlights, type FlightSearchResult } from "@/features/flight-search/queries";
import { listActiveAirports } from "@/features/airports/queries";
import { formatLongDate } from "@/features/flights/format";
import { parseDateString } from "@/lib/dates";

export const metadata: Metadata = { title: "Mostrador: búsqueda de vuelos — VolAR" };

type SearchParams = Record<string, string | string[] | undefined>;

// US-32: reutiliza la búsqueda pública de vuelos (US-13) para asistir a un
// pasajero en persona (mostrador.html, pestaña 1).
export default async function MostradorBusquedaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const hasQuery = sp.origen !== undefined || sp.destino !== undefined || sp.fecha !== undefined;
  const parsed = hasQuery ? flightSearchSchema.safeParse(sp) : null;
  const [airports, flights] = await Promise.all([
    listActiveAirports(),
    parsed?.success ? searchFlights(parsed.data) : Promise.resolve(null),
  ]);

  const formDefaults = {
    origen: typeof sp.origen === "string" ? sp.origen : "",
    destino: typeof sp.destino === "string" ? sp.destino : "",
    fecha: typeof sp.fecha === "string" ? sp.fecha : "",
  };

  return (
    <ListNavigationProvider>
      <div id="buscador" className="scroll-mt-6">
        <FlightSearchForm
          key={`${formDefaults.origen}-${formDefaults.destino}-${formDefaults.fecha}`}
          airports={airports}
          defaultValues={formDefaults}
          basePath="/mostrador"
        />
      </div>

      <ListResults skeleton={<FlightResultsSkeleton />}>
        {parsed?.success && flights && (
          <MostradorResults search={parsed.data} flights={flights} airports={airports} />
        )}
      </ListResults>
    </ListNavigationProvider>
  );
}

function MostradorResults({
  search,
  flights,
  airports,
}: {
  search: FlightSearchValues;
  flights: FlightSearchResult[];
  airports: { id: string; code: string; city: string }[];
}) {
  const origin = airports.find((a) => a.id === search.origen);
  const destination = airports.find((a) => a.id === search.destino);
  const label = (a?: { code: string; city: string }) => (a ? `${a.city} (${a.code})` : "—");

  return (
    <section className="mt-6 space-y-5" aria-live="polite">
      <div>
        <h2 className="text-lg font-extrabold">
          {label(origin)} → {label(destination)}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <strong className="text-foreground">{formatLongDate(parseDateString(search.fecha))}</strong> ·{" "}
          <strong className="text-foreground">
            {flights.length} {flights.length === 1 ? "vuelo encontrado" : "vuelos encontrados"}
          </strong>
        </p>
      </div>

      {flights.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          No hay vuelos disponibles para esa búsqueda. Probá con otra fecha u otro origen/destino.
        </p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {flights.map((f) => (
            <li key={f.id}>
              <FlightResultCard flight={f} basePath="/mostrador/venta" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
