import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto genérico de las pantallas de administración (título, formulario/filtros
// y tabla). Se muestra dentro del layout, así que la navegación queda visible.
export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-4 w-72 max-w-full" />
        <Skeleton className="h-7 w-80 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-64" />
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <div className="flex gap-4 border-b bg-muted/40 p-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
            {Array.from({ length: 6 }, (_, r) => (
              <div key={r} className="flex items-center gap-4 border-b p-3 last:border-b-0">
                {Array.from({ length: 4 }, (_, c) => (
                  <Skeleton key={c} className="h-4 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
