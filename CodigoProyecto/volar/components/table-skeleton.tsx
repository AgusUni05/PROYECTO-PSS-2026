import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto de un listado con tabla y paginación. Reemplaza solo la zona de resultados
// mientras se aplica un filtro o se cambia de página.
export function TableSkeleton({ columns, rows = 6 }: { columns: number; rows?: number }) {
  return (
    <Card aria-busy="true" aria-live="polite">
      <CardHeader>
        <Skeleton className="h-5 w-64" />
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border">
          <div className="flex gap-4 border-b bg-muted/40 p-3">
            {Array.from({ length: columns }, (_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="flex items-center gap-4 border-b p-3 last:border-b-0">
              {Array.from({ length: columns }, (_, c) => (
                <Skeleton key={c} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
