import { Skeleton } from "@/components/ui/skeleton";
import { FlightResultsSkeleton, FlightSearchFormSkeleton } from "@/features/flight-search/components/flight-search-skeleton";

// Mientras se busca en /vuelos (cambio de querystring o primera carga) se muestra
// el esqueleto del buscador y de los resultados, con el mismo layout que la página.
export default function VuelosLoading() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true" aria-live="polite">
      <div className="h-[84px] bg-tower" />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-7 px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-4 w-56" />
        <FlightSearchFormSkeleton />
        <div className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-7 w-72 max-w-full" />
            <Skeleton className="h-4 w-48" />
          </div>
          <FlightResultsSkeleton />
        </div>
      </main>
    </div>
  );
}
