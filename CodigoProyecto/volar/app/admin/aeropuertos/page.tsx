import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AirportForm } from "@/features/airports/components/airport-form";
import { AirportFilters } from "@/features/airports/components/airport-filters";
import { AirportTable } from "@/features/airports/components/airport-table";
import { getAirportById, listAirports } from "@/features/airports/queries";

type SearchParams = { q?: string; estado?: string; page?: string; editar?: string };

// US-01: ABML de Aeropuertos (aeropuertos.html).
export default async function AeropuertosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { airports, total, page, pageCount, filters } = await listAirports(sp);
  const editingAirport = sp.editar ? await getAirportById(sp.editar) : null;
  const editing = editingAirport
    ? {
        id: editingAirport.id,
        values: {
          code: editingAirport.code,
          name: editingAirport.name,
          city: editingAirport.city,
        },
      }
    : undefined;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Administración &gt; Catálogo Maestro &gt;{" "}
        <span className="font-medium text-foreground">Gestión de Aeropuertos</span>
      </p>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Gestión de Aeropuertos
          </h1>
          <p className="text-sm text-muted-foreground">
            Alta, modificación, baja y listado de aeropuertos para orígenes y destinos de
            trayectos.
          </p>
        </div>
        <Link href="#form-aeropuerto" className={buttonVariants()}>
          + Nuevo Aeropuerto
        </Link>
      </div>

      <Alert>
        <AlertTitle>Regla de negocio (US-01)</AlertTitle>
        <AlertDescription>
          El código IATA/ICAO es único y obligatorio. No se puede dar de baja un aeropuerto con
          vuelos futuros programados.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <AirportForm editing={editing} />
        <AirportFilters filters={filters} />
      </div>

      <AirportTable
        airports={airports}
        total={total}
        page={page}
        pageCount={pageCount}
        filters={filters}
      />
    </div>
  );
}
