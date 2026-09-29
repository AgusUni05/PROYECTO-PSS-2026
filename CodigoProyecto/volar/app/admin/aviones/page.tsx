import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AirplaneForm } from "@/features/airplanes/components/airplane-form";
import { AirplaneFilters } from "@/features/airplanes/components/airplane-filters";
import { AirplaneTable } from "@/features/airplanes/components/airplane-table";
import { getAirplaneById, listAirplanes } from "@/features/airplanes/queries";

type SearchParams = { q?: string; estado?: string; config?: string; page?: string; editar?: string };

// US-02: ABML de Aviones (aviones.html).
export default async function AvionesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { airplanes, total, page, pageCount, filters, summary } = await listAirplanes(sp);
  const editingAirplane = sp.editar ? await getAirplaneById(sp.editar) : null;
  const editing = editingAirplane
    ? {
        id: editingAirplane.id,
        values: {
          identifier: editingAirplane.identifier,
          model: editingAirplane.model,
          economySeats: editingAirplane.economySeats,
          firstClassSeats: editingAirplane.firstClassSeats,
        },
      }
    : undefined;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Administración &gt; Catálogo Maestro &gt;{" "}
        <span className="font-medium text-foreground">Gestión de Aviones y Flota</span>
      </p>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Gestión de Aviones
          </h1>
          <p className="text-sm text-muted-foreground">
            Alta, modificación, baja y configuración de capacidad por clase (Economy y Primera
            Clase) de la flota.
          </p>
        </div>
        <Link href="#form-avion" className={buttonVariants()}>
          + Nuevo Avión
        </Link>
      </div>

      <Alert>
        <AlertTitle>Regla de negocio (US-02)</AlertTitle>
        <AlertDescription>
          El identificador de avión es único. No se puede dar de baja un avión con vuelos futuros
          asignados. Al modificar la capacidad, el sistema valida que no quede por debajo de los
          pasajes ya vendidos.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <AirplaneForm key={editing?.id ?? "new"} editing={editing} />
        <AirplaneFilters filters={filters} summary={summary} />
      </div>

      <AirplaneTable
        airplanes={airplanes}
        total={total}
        page={page}
        pageCount={pageCount}
        filters={filters}
      />
    </div>
  );
}
