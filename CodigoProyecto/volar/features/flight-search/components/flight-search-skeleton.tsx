import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto del buscador (mismo layout que FlightSearchForm) mientras cargan los aeropuertos.
export function FlightSearchFormSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="grid grid-cols-1 gap-2 rounded-[22px] bg-card p-2.5 shadow-[0_30px_70px_-30px_rgba(22,19,61,0.45),0_2px_6px_rgba(22,19,61,0.06)] sm:grid-cols-2 sm:gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_210px_auto] lg:gap-0">
        <div className="flex flex-col gap-2 rounded-2xl px-5 py-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex flex-col gap-2 rounded-2xl px-5 py-3 sm:pl-[34px]">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex flex-col gap-2 rounded-2xl px-5 py-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="min-h-16 rounded-2xl lg:ml-1.5 lg:w-[160px]" />
      </div>
      <div className="flex items-center justify-between px-2 pt-[18px]">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3.5 w-32" />
      </div>
    </div>
  );
}

// Esqueleto de una tarjeta de resultado (FlightResultCard).
export function FlightResultsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul aria-hidden="true" className="flex flex-col gap-3.5">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[minmax(0,1fr)_248px_248px]">
            <div className="flex flex-col justify-center gap-5 px-5 py-6 sm:px-7">
              <Skeleton className="h-6 w-40 rounded-full" />
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-[22px]">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-1 w-full rounded-full" />
                <div className="flex flex-col items-end gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
            {[0, 1].map((j) => (
              <div key={j} className="flex flex-col gap-3 border-t border-border px-5 py-[22px] md:border-t-0 md:border-l sm:px-[22px]">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-auto h-10 w-full" />
              </div>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
