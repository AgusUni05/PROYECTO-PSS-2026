import Link from "next/link";
import { Info } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
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

      <div className="flex items-start gap-3.5 rounded-2xl bg-secondary p-4 text-[#2E1A8F]">
        <span className="grid size-[34px] flex-none place-items-center rounded-[10px] bg-card text-primary">
          <Info className="size-[18px]" />
        </span>
        <div>
          <b className="block text-[13.5px]">Regla integrada</b>
          <p className="m-0 text-[13.5px] leading-[1.55] text-[#3D3470]">
            El código IATA/ICAO es único y obligatorio. No se puede dar de baja un aeropuerto con
            vuelos futuros programados.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AirportForm key={editing?.id ?? "new"} editing={editing} />
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
