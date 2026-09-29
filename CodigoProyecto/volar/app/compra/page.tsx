import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getFlightOnSale, type FlightSearchResult } from "@/features/flight-search/queries";
import { buildClassOptions } from "@/features/flight-search/class-options";
import { purchaseSelectionSchema } from "@/features/purchase/schema";
import { formatCurrency, formatLongDate, formatTime } from "@/features/flights/format";

export const metadata: Metadata = {
  title: "Iniciar compra — VolAR",
};

type SearchParams = Record<string, string | string[] | undefined>;

// US-14: inicio del flujo de compra desde un resultado de búsqueda. Es el
// único punto del sitio público que pide sesión (se navega y busca sin cuenta).
// Cantidad de pasajes, datos de pasajeros y pago: US-15 en adelante.
export default async function CompraPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const parsed = purchaseSelectionSchema.safeParse(await searchParams);

  if (!parsed.success) {
    return (
      <PurchaseShell>
        <Unavailable
          title="La selección no es válida"
          description="El enlace con el que llegaste está incompleto o fue modificado. Buscá el vuelo de nuevo."
        />
      </PurchaseShell>
    );
  }

  const selection = parsed.data;
  const user = await getCurrentUser();
  if (!user) {
    const returnTo = `/compra?${new URLSearchParams(selection)}`;
    redirect(`/sign-in?${new URLSearchParams({ redirect_url: returnTo })}`);
  }

  const flight = await getFlightOnSale(selection.vuelo);
  if (!flight) {
    return (
      <PurchaseShell>
        <Unavailable
          title="Este vuelo ya no está disponible para la venta"
          description="Puede haberse agotado, cancelado o quedado fuera de su período de venta. Buscá otra opción."
        />
      </PurchaseShell>
    );
  }

  const option = buildClassOptions(flight).find((o) => o.seatClass === selection.clase)!;
  if (option.status === "sold-out") {
    return (
      <PurchaseShell>
        <Unavailable
          title={`No quedan asientos en ${option.label} para el vuelo ${flight.code}`}
          description="Podés elegir otra clase de este vuelo u otro vuelo."
          backHref={resultsHref(flight)}
        />
      </PurchaseShell>
    );
  }

  return (
    <PurchaseShell>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Tu selección</CardTitle>
          <Badge variant="secondary" className="font-mono">
            Vuelo {flight.code}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <SummaryItem label="Trayecto">
              {flight.origin.city} ({flight.origin.code}) → {flight.destination.city} (
              {flight.destination.code})
            </SummaryItem>
            <SummaryItem label="Fecha">{formatLongDate(flight.date)}</SummaryItem>
            <SummaryItem label="Horario">
              {formatTime(flight.departureAt)} → {formatTime(flight.arrivalAt)}
            </SummaryItem>
            <SummaryItem label="Aeronave">{flight.airplaneModel}</SummaryItem>
            <SummaryItem label="Clase">{option.label}</SummaryItem>
            <SummaryItem label="Tarifa por pasajero">
              {formatCurrency(option.fare)}{" "}
              <span className="text-xs text-muted-foreground">
                ({option.available} cupos disponibles)
              </span>
            </SummaryItem>
          </dl>

          <Alert>
            <AlertTitle>Próximo paso</AlertTitle>
            <AlertDescription>
              La elección de la cantidad de pasajes, la carga de datos de los pasajeros y el pago se
              habilitan en la próxima etapa del sistema.
            </AlertDescription>
          </Alert>

          <Link href={resultsHref(flight)} className={buttonVariants({ variant: "outline" })}>
            Cambiar selección
          </Link>
        </CardContent>
      </Card>
    </PurchaseShell>
  );
}

function resultsHref(flight: FlightSearchResult): string {
  const params = new URLSearchParams({
    origen: flight.origin.id,
    destino: flight.destination.id,
    fecha: flight.date.toISOString().slice(0, 10),
  });
  return `/vuelos?${params}`;
}

function PurchaseShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-8">
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Inicio
          </Link>{" "}
          &gt;{" "}
          <Link href="/vuelos" className="hover:text-foreground">
            Búsqueda de Vuelos
          </Link>{" "}
          &gt; <span className="font-medium text-foreground">Iniciar Compra</span>
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Iniciar compra</h1>
        {children}
      </main>
    </div>
  );
}

function Unavailable({
  title,
  description,
  backHref = "/vuelos",
}: {
  title: string;
  description: string;
  backHref?: string;
}) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{description}</p>
        <Link href={backHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Volver a buscar
        </Link>
      </AlertDescription>
    </Alert>
  );
}

function SummaryItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
