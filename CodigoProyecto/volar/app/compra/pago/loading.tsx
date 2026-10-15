import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto de la pantalla "Pago de la compra" mientras se carga la reserva.
export default function PagoLoading() {
  return (
    <div className="flex flex-1 flex-col bg-background" aria-busy="true" aria-live="polite">
      <div className="h-[84px] bg-tower" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-4 w-64" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-56" />
        </div>
        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </CardHeader>
            <div className="space-y-4 px-6 pt-4 pb-6">
              <Skeleton className="h-12 w-full rounded-lg" />
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ))}
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          </Card>
          <Card className="gap-4 p-5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </Card>
        </div>
      </main>
    </div>
  );
}
