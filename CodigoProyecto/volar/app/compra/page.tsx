import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getFlightOnSale, type FlightSearchResult } from "@/features/flight-search/queries";
import { buildClassOptions } from "@/features/flight-search/class-options";
import { purchaseSelectionSchema } from "@/features/purchase/schema";
import { formatCurrency, formatLongDate, formatTime } from "@/features/flights/format";
import { cn } from "@/lib/utils";

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
      <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-5">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Tu selección</CardTitle>
            <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs">{flight.code}</span>
          </CardHeader>

          <div className="mx-6 mt-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 rounded-2xl bg-muted px-6 py-5">
            <div>
              <div className="text-[30px] leading-none font-extrabold tracking-[-0.035em]">
                {formatTime(flight.departureAt)}
              </div>
              <div className="mt-1.5 text-[13px] text-muted-foreground">
                {flight.origin.code} · {flight.origin.city}
              </div>
            </div>
            <div className="relative h-[22px]">
              <span className="absolute inset-x-1 top-1/2 border-t-2 border-dotted border-[#C9C5DE]" />
              <span className="relative z-[1] size-2.5 rounded-full border-2 border-primary bg-muted" />
              <span className="absolute right-0 top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-primary" />
            </div>
            <div className="text-right">
              <div className="text-[30px] leading-none font-extrabold tracking-[-0.035em]">
                {formatTime(flight.arrivalAt)}
              </div>
              <div className="mt-1.5 text-[13px] text-muted-foreground">
                {flight.destination.code} · {flight.destination.city}
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-6 pt-5 pb-6">
            <SummaryItem label="Trayecto">
              {flight.origin.city} ({flight.origin.code}) → {flight.destination.city} (
              {flight.destination.code})
            </SummaryItem>
            <SummaryItem label="Fecha">{formatLongDate(flight.date)}</SummaryItem>
            <SummaryItem label="Aeronave">{flight.airplaneModel}</SummaryItem>
            <SummaryItem label="Clase">{option.label}</SummaryItem>
          </dl>
        </Card>

        <Card className="gap-4 p-5">
          <h2 className="text-base font-extrabold">Detalle del precio</h2>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Clase</span>
            <b className="text-foreground">{option.label}</b>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Cupos disponibles</span>
            <b className="text-foreground">{option.available}</b>
          </div>
          <div className="flex items-end justify-between border-t border-dashed border-border pt-4">
            <span className="text-[13px] font-semibold text-muted-foreground">Tarifa por pasajero</span>
            <strong className="text-[28px] font-extrabold tracking-[-0.03em]">{formatCurrency(option.fare)}</strong>
          </div>

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
        </Card>
      </div>
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
    <div className="flex flex-1 flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-8 py-8">
        <nav className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Inicio
          </Link>
          <span aria-hidden>/</span>
          <Link href="/vuelos" className="hover:text-foreground">
            Búsqueda de vuelos
          </Link>
          <span aria-hidden>/</span>
          <b className="font-semibold text-foreground">Iniciar compra</b>
        </nav>

        <div className="flex items-center justify-between gap-6">
          <h1 className="text-[30px] font-extrabold tracking-[-0.035em]">Iniciar compra</h1>
          <ol className="flex list-none items-center gap-2.5 p-0 text-[13px] font-bold text-muted-foreground">
            <Step n={1} label="Selección" active />
            <StepLine />
            <Step n={2} label="Pasajeros" />
            <StepLine />
            <Step n={3} label="Pago" />
          </ol>
        </div>

        {children}
      </main>
    </div>
  );
}

function Step({ n, label, active = false }: { n: number; label: string; active?: boolean }) {
  return (
    <li className={cn("flex items-center gap-2", active && "text-foreground")}>
      <span
        className={cn(
          "grid size-7 place-items-center rounded-full border-[1.5px] border-[#D6D4E2] bg-card text-xs",
          active && "border-primary bg-primary text-primary-foreground shadow-[0_0_0_5px_var(--secondary)]",
        )}
      >
        {n}
      </span>
      {label}
    </li>
  );
}

function StepLine() {
  return <span aria-hidden className="h-0.5 w-9 rounded-full bg-[#DCDAE8]" />;
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
    <Alert variant="destructive" className="rounded-2xl p-5">
      <AlertTitle className="text-[15px]">{title}</AlertTitle>
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
