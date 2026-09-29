import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GenerateFlightsForm } from "@/features/flights/components/generate-flights-form";
import { FlightFilters } from "@/features/flights/components/flight-filters";
import { FlightTable } from "@/features/flights/components/flight-table";
import { listFlights } from "@/features/flights/queries";
import { listActiveRoutes } from "@/features/routes/queries";
import { listActiveAirplanes } from "@/features/airplanes/queries";
import { listActiveAirports } from "@/features/airports/queries";

type SearchParams = {
  fecha?: string;
  origen?: string;
  destino?: string;
  estado?: string;
  page?: string;
};

// US-04/US-07: generación de vuelos con fechas reales (vuelos_admin.html).
export default async function VuelosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const [{ flights, total, page, pageCount, filters }, routes, airplanes, airports] =
    await Promise.all([
      listFlights(sp),
      listActiveRoutes(),
      listActiveAirplanes(),
      listActiveAirports(),
    ]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Administración &gt; Operaciones &gt;{" "}
        <span className="font-medium text-foreground">Generación y Configuración de Vuelos</span>
      </p>

      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Programación de Vuelos con Fechas Reales
        </h1>
        <p className="text-sm text-muted-foreground">
          Generación por período, asignación de avión, configuración de capacidad por clase y
          definición de tarifas comerciales.
        </p>
      </div>

      <Alert>
        <AlertTitle>Reglas integradas (US-04/07/09/11)</AlertTitle>
        <AlertDescription>
          Se genera un vuelo por cada fecha del período que coincida con los días de operación del
          trayecto. Si alguna fecha ya tiene un vuelo generado para ese trayecto, o si el avión
          elegido queda con horarios superpuestos, no se genera nada: hay que ajustar el rango o
          elegir otro avión. La capacidad y la tarifa se aplican a todos los vuelos generados; la
          capacidad por clase no puede superar los asientos del avión y las tarifas deben ser mayores a
          0. Después, la capacidad y la tarifa de cada vuelo se ajustan con &quot;Editar Vuelo&quot;
          (sin bajar de los pasajes ya vendidos).
        </AlertDescription>
      </Alert>

      <GenerateFlightsForm routes={routes} airplanes={airplanes} />

      <FlightFilters filters={filters} airports={airports} />

      <FlightTable flights={flights} total={total} page={page} pageCount={pageCount} filters={filters} />
    </div>
  );
}
