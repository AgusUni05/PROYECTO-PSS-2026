import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto de la pantalla de comprobantes mientras se carga la reserva.
export default function ComprobantesLoading() {
  return (
    <div className="flex flex-1 flex-col bg-background" aria-busy="true" aria-live="polite">
      <div className="h-[84px] bg-tower" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-4 w-64" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-6 w-56" />
        </div>
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-5 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </main>
    </div>
  );
}
