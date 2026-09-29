import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlightSearchForm } from "@/features/flight-search/components/flight-search-form";
import { flightSearchSchema, type FlightSearchValues } from "@/features/flight-search/schema";
import { searchFlights, type FlightSearchResult } from "@/features/flight-search/queries";
import { listActiveAirports } from "@/features/airports/queries";
import { formatLongDate, formatTime } from "@/features/flights/format";
import { parseDateString } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Buscar vuelos — VolAR",
};

type SearchParams = Record<string, string | string[] | undefined>;

// US-13: búsqueda pública de vuelos (busqueda_pasajero.html). Sin sesión.
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

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-6 py-8">
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Inicio
          </Link>{" "}
          &gt; <span className="font-medium text-foreground">Búsqueda y Selección de Vuelos</span>
        </p>

        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Buscador y Selección de Vuelos
          </h1>
          <p className="text-sm text-muted-foreground">
            Consultá la disponibilidad por origen, destino y fecha, con tarifas y cupos por clase.
          </p>
        </div>

        <Card id="buscador" className="scroll-mt-6">
          <CardHeader>
            <CardTitle>¿A dónde querés viajar?</CardTitle>
          </CardHeader>
          <CardContent>
            <FlightSearchForm
              key={`${formDefaults.origen}-${formDefaults.destino}-${formDefaults.fecha}`}
              airports={airports}
              defaultValues={formDefaults}
            />
          </CardContent>
        </Card>

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
    <section className="space-y-4" aria-live="polite">
      <div>
        <h2 className="font-heading text-lg font-semibold">
          Resultados para: {label(origin)} → {label(destination)}
        </h2>
        <p className="text-sm text-muted-foreground">
          Fecha: <strong>{formatLongDate(parseDateString(search.fecha))}</strong> •{" "}
          <strong>
            {flights.length} {flights.length === 1 ? "vuelo encontrado" : "vuelos encontrados"}
          </strong>{" "}
          (ordenados por hora de salida)
        </p>
      </div>

      {flights.length === 0 ? (
        <Card className="border border-dashed ring-0">
          <CardContent className="space-y-3 py-6 text-center">
            <p className="font-heading text-lg font-semibold">
              No encontramos vuelos disponibles para la fecha seleccionada
            </p>
            <p className="text-sm text-muted-foreground">
              No hay vuelos a la venta para este trayecto en esa fecha, o ya no quedan asientos
              disponibles. Probá con otra fecha u otro origen / destino.
            </p>
            <Link href="#buscador" className={buttonVariants({ variant: "outline" })}>
              Cambiar búsqueda
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {flights.map((f) => (
            <li key={f.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-4">
                  <Badge variant="secondary" className="font-mono">
                    {f.code}
                  </Badge>
                  <span className="font-mono text-base font-semibold">
                    {formatTime(f.departureAt)} → {formatTime(f.arrivalAt)}
                  </span>
                  <span className="text-muted-foreground">
                    {f.origin.code} → {f.destination.code}
                  </span>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
