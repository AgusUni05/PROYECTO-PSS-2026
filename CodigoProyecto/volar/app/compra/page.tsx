import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getFlightOnSale } from "@/features/flight-search/queries";
import { buildClassOptions } from "@/features/flight-search/class-options";
import { purchaseSelectionSchema } from "@/features/purchase/schema";
import { ConfirmPurchaseForm } from "@/features/purchase/components/confirm-purchase-form";
import { formatCurrency, formatLongDate, formatTime } from "@/features/flights/format";
import {
  PurchaseShell,
  Unavailable,
  resultsHref,
} from "@/features/purchase/components/purchase-shell";

export const metadata: Metadata = {
  title: "Iniciar compra — VolAR",
};

type SearchParams = Record<string, string | string[] | undefined>;

// US-14: inicio del flujo de compra desde un resultado de búsqueda. Es el
// único punto del sitio público que pide sesión (se navega y busca sin cuenta).
// Es el paso 1 del flujo; pasajeros (paso 2) y pago (paso 3): US-15 en adelante.
export default async function CompraPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const parsed = purchaseSelectionSchema.safeParse(await searchParams);

  if (!parsed.success) {
    return (
      <PurchaseShell title="Iniciar compra" currentStep={1}>
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
      <PurchaseShell title="Iniciar compra" currentStep={1}>
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
      <PurchaseShell title="Iniciar compra" currentStep={1}>
        <Unavailable
          title={`No quedan asientos en ${option.label} para el vuelo ${flight.code}`}
          description="Podés elegir otra clase de este vuelo u otro vuelo."
          backHref={resultsHref(flight)}
        />
      </PurchaseShell>
    );
  }

  return (
    <PurchaseShell title="Iniciar compra" currentStep={1}>
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Tu selección</CardTitle>
            <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs">{flight.code}</span>
          </CardHeader>

          <div className="mx-4 mt-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-muted px-4 py-5 sm:mx-6 sm:gap-5 sm:px-6">
            <div>
              <div className="text-[22px] leading-none font-extrabold tracking-[-0.035em] sm:text-[30px]">
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
              <div className="text-[22px] leading-none font-extrabold tracking-[-0.035em] sm:text-[30px]">
                {formatTime(flight.arrivalAt)}
              </div>
              <div className="mt-1.5 text-[13px] text-muted-foreground">
                {flight.destination.code} · {flight.destination.city}
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 px-6 pt-5 pb-6 sm:grid-cols-2">
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

          <ConfirmPurchaseForm
            flightId={flight.id}
            seatClass={option.seatClass}
            maxAvailable={option.available}
            fare={option.fare}
          />

          <Alert>
            <AlertTitle>Próximo paso</AlertTitle>
            <AlertDescription>
              Al confirmar, los cupos quedan retenidos por 10 minutos para que cargues los datos
              de cada pasajero y completes el pago.
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

function SummaryItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
