import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getFlightOnSale } from "@/features/flight-search/queries";
import { buildClassOptions } from "@/features/flight-search/class-options";
import { purchaseSelectionSchema } from "@/features/purchase/schema";
import { CounterSaleForm } from "@/features/counter/components/counter-sale-form";
import { formatLongDate, formatTime } from "@/features/flights/format";

export const metadata: Metadata = { title: "Mostrador: venta presencial — VolAR" };

type SearchParams = Record<string, string | string[] | undefined>;

// US-33: venta presencial a partir de un resultado de búsqueda de mostrador (US-32).
export default async function MostradorVentaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const parsed = purchaseSelectionSchema.safeParse(await searchParams);

  if (!parsed.success) {
    return <Unavailable message="La selección no es válida. Buscá el vuelo de nuevo." />;
  }

  const flight = await getFlightOnSale(parsed.data.vuelo);
  if (!flight) {
    return <Unavailable message="Este vuelo ya no está disponible para la venta." />;
  }

  const option = buildClassOptions(flight).find((o) => o.seatClass === parsed.data.clase)!;
  if (option.status === "sold-out") {
    return <Unavailable message={`No quedan asientos en ${option.label} para el vuelo ${flight.code}.`} />;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm">
        <b>Vuelo seleccionado:</b> {flight.code} ({flight.origin.code} → {flight.destination.code}) ·{" "}
        {formatLongDate(flight.date)} · Salida {formatTime(flight.departureAt)} hs · {option.label} ·{" "}
        {formatCurrencyLabel(option.fare)} por pasaje · {option.available} cupos disponibles
      </div>

      <CounterSaleForm
        flightId={flight.id}
        seatClass={option.seatClass}
        fare={option.fare}
        maxAvailable={option.available}
      />
    </div>
  );
}

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function formatCurrencyLabel(fare: string): string {
  return currencyFormatter.format(Number(fare));
}

function Unavailable({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-10 text-center">
      <p className="text-lg font-bold">No se puede continuar con esta venta</p>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <Link href="/mostrador" className={buttonVariants({ variant: "outline" })}>
        Volver a la búsqueda
      </Link>
    </div>
  );
}
