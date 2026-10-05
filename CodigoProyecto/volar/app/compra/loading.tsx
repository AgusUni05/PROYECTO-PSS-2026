import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto de la pantalla "Iniciar compra" mientras se carga la selección.
export default function CompraLoading() {
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
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </CardHeader>
            <div className="mx-4 mt-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-muted px-4 py-5 sm:mx-6 sm:px-6">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-1 w-full" />
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-6 pt-5 pb-6 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
          </Card>
          <Card className="gap-4 p-5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </Card>
        </div>
      </main>
    </div>
  );
}
