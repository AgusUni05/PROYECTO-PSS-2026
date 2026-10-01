import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { FlightSearchForm } from "@/features/flight-search/components/flight-search-form";
import { FlightResultCard } from "@/features/flight-search/components/flight-result-card";
import { flightSearchSchema, type FlightSearchValues } from "@/features/flight-search/schema";
import { searchFlights, type FlightSearchResult } from "@/features/flight-search/queries";
import { listActiveAirports } from "@/features/airports/queries";
import { formatLongDate } from "@/features/flights/format";
import { parseDateString } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Buscar vuelos — VolAR",
};

type SearchParams = Record<string, string | string[] | undefined>;

// US-13/US-14: búsqueda pública de vuelos y detalle de cada opción
// (busqueda_pasajero.html). Sin sesión: se pide recién al iniciar la compra.
export default async function VuelosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const airports = await listActiveAirports();

  const hasQuery = sp.origen !== undefined || sp.destino !== undefined || sp.fecha !== undefined;
  const parsed = hasQuery ? flightSearchSchema.safeParse(sp) : null;
  const flights = parsed?.success ? await searchFlights(parsed.data) : null;

  const formDefaults = {
    origen: typeof sp.origen === "string" ? sp.origen : "",
    destino: typeof sp.destino === "string" ? sp.destino : "",
    fecha: typeof sp.fecha === "string" ? sp.fecha : "",
  };

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-7 px-4 py-8 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Inicio</Link>
          <span aria-hidden>/</span>
          <b className="font-semibold text-foreground">Búsqueda y selección de vuelos</b>
        </nav>

        <div id="buscador" className="scroll-mt-6">
          <FlightSearchForm
            key={`${formDefaults.origen}-${formDefaults.destino}-${formDefaults.fecha}`}
            airports={airports}
            defaultValues={formDefaults}
          />
        </div>

        {parsed && !parsed.success && (
          <Alert variant="destructive">
            <AlertTitle>No pudimos buscar con esos datos</AlertTitle>
            <AlertDescription>
              {parsed.error.issues.map((issue) => issue.message).join(". ")}. Corregí la búsqueda y
              volvé a intentar.
            </AlertDescription>
          </Alert>
        )}

        {parsed?.success && flights && (
          <SearchResults search={parsed.data} flights={flights} airports={airports} />
        )}
      </main>
    </div>
  );
}

function SearchResults({
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
    <section className="space-y-5" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.03em] sm:text-[26px]">
            {label(origin)} → {label(destination)}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            <strong className="text-foreground">{formatLongDate(parseDateString(search.fecha))}</strong> ·{" "}
            <strong className="text-foreground">
              {flights.length} {flights.length === 1 ? "vuelo encontrado" : "vuelos encontrados"}
            </strong>
          </p>
        </div>
      </div>

      {flights.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-10 text-center">
          <p className="text-lg font-bold">No encontramos vuelos disponibles para la fecha seleccionada</p>
          <p className="max-w-md text-sm text-muted-foreground">
            No hay vuelos a la venta para este trayecto en esa fecha, o ya no quedan asientos
            disponibles. Probá con otra fecha u otro origen / destino.
          </p>
          <Link href="#buscador" className={buttonVariants({ variant: "outline" })}>
            Cambiar búsqueda
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {flights.map((f) => (
            <li key={f.id}>
              <FlightResultCard flight={f} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
