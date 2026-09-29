import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RouteForm } from "@/features/routes/components/route-form";
import { RouteFilters } from "@/features/routes/components/route-filters";
import { RouteTable } from "@/features/routes/components/route-table";
import { getRouteById, listRoutes } from "@/features/routes/queries";
import { listActiveAirports } from "@/features/airports/queries";

type SearchParams = { origen?: string; destino?: string; estado?: string; page?: string; editar?: string };

// US-03: ABML de Trayectos (trayectos.html).
export default async function TrayectosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const [{ routes, total, page, pageCount, filters }, airports, editingRoute] = await Promise.all(
    [listRoutes(sp), listActiveAirports(), sp.editar ? getRouteById(sp.editar) : null],
  );

  const editing = editingRoute
    ? {
        id: editingRoute.id,
        values: {
          originId: editingRoute.originId,
          destinationId: editingRoute.destinationId,
          operatingDays: editingRoute.operatingDays,
          departureTime: editingRoute.departureTime,
          arrivalTime: editingRoute.arrivalTime,
        },
      }
    : undefined;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Administración &gt; Planificación Operativa &gt;{" "}
        <span className="font-medium text-foreground">Gestión de Trayectos</span>
      </p>

      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Gestión de Trayectos (Rutas y Frecuencias)
        </h1>
        <p className="text-sm text-muted-foreground">
          Definición de origen, destino, frecuencia semanal de días y horarios de salida/llegada.
        </p>
      </div>

      <Alert>
        <AlertTitle>Regla de negocio (US-03)</AlertTitle>
        <AlertDescription>
          Origen y destino deben ser aeropuertos distintos. Se debe marcar al menos un día de la
          semana. Si el horario de llegada es anterior al de partida, se muestra como llegada del
          día siguiente (+1 día). Un trayecto con pasajes vendidos no se puede modificar ni dar
          de baja: hay que cancelarlo primero.
        </AlertDescription>
      </Alert>

      <RouteForm airports={airports} editing={editing} />

      <RouteFilters filters={filters} airports={airports} />

      <RouteTable routes={routes} total={total} page={page} pageCount={pageCount} filters={filters} />
    </div>
  );
}
