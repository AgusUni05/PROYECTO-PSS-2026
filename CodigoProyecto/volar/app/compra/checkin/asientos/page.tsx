import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { AccountShell } from "@/components/account-shell";
import { getCurrentUser } from "@/lib/auth";
import { bookingCodeSchema } from "@/features/purchase/schema";
import { SEAT_CLASS_LABELS } from "@/features/flight-search/class-options";
import { getSeatSelectionView } from "@/features/seats/queries";
import { SeatMap } from "@/features/seats/components/seat-map";
import { CheckinFlightHeader } from "@/features/checkin/components/checkin-flight-header";

export const metadata: Metadata = {
  title: "Elegir asientos — VolAR",
};

const TITLE = "Check-in online";

type SearchParams = Record<string, string | string[] | undefined>;

// US-37: paso 1 del check-in online, elegir los asientos en el mapa de la
// cabina (/compra/checkin/asientos?reserva=…, seleccion_asiento.html). El
// paso 2 es la confirmación del check-in de la US-38.
export default async function AsientosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const code = bookingCodeSchema.safeParse((await searchParams).reserva);
  if (!code.success) {
    return (
      <NotAvailable
        title="No pudimos identificar la reserva"
        description="El enlace está incompleto o fue modificado. Entrá al check-in desde Mis Compras."
      />
    );
  }

  const checkinHref = `/compra/checkin?${new URLSearchParams({ reserva: code.data })}`;
  const user = await getCurrentUser();
  if (!user) {
    const returnTo = `/compra/checkin/asientos?${new URLSearchParams({ reserva: code.data })}`;
    redirect(`/sign-in?${new URLSearchParams({ redirect_url: returnTo })}`);
  }

  // La titularidad sale solo de la sesión: una reserva ajena y una
  // inexistente muestran el mismo estado.
  const view = await getSeatSelectionView(code.data, user.id);
  if (!view) {
    return (
      <NotAvailable
        title="No encontramos esta reserva"
        description="El código no corresponde a ninguna reserva de tu cuenta."
      />
    );
  }
  // Sin vuelos para elegir (ventana cerrada o check-in hecho), el check-in
  // muestra el estado que corresponde.
  if (view.flights.length === 0) redirect(checkinHref);

  return (
    <AccountShell
      title={TITLE}
      description={`Reserva ${view.code}. Paso 1 de 2: elegí los asientos. Después confirmás el check-in.`}
      actions={
        <Link href="/cuenta" className={buttonVariants({ variant: "outline" })}>
          Volver a Mis Compras
        </Link>
      }
    >
      <div className="grid gap-4">
        {view.flights.map((item) => (
          <section
            key={item.flight.id}
            className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
          >
            <CheckinFlightHeader flight={item.flight} boardingAt={item.boardingAt} />
            <p className="text-sm text-muted-foreground">
              {`Clase ${SEAT_CLASS_LABELS[item.seatClass]}. Elegí un pasajero y tocá un asiento libre. Los asientos que elijas quedan bloqueados para otros compradores.`}
            </p>
            <SeatMap
              code={view.code}
              flightId={item.flight.id}
              section={item.section}
              otherClass={item.otherClass}
              occupied={item.occupied}
              passengers={item.passengers}
            />
          </section>
        ))}
      </div>
    </AccountShell>
  );
}

function NotAvailable({ title, description }: { title: string; description: string }) {
  return (
    <AccountShell title={TITLE}>
      <Alert variant="destructive" className="rounded-2xl p-5">
        <AlertTitle className="text-[15px]">{title}</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{description}</p>
          <Link href="/cuenta" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Volver a Mis Compras
          </Link>
        </AlertDescription>
      </Alert>
    </AccountShell>
  );
}
