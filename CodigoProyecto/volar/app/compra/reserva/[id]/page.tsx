import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { idSchema } from "@/lib/id";
import { getBookingHold, type BookingHold } from "@/features/purchase/service";
import { CountdownTimer } from "@/features/purchase/components/countdown-timer";
import { SEAT_CLASS_LABELS } from "@/features/flight-search/class-options";
import { formatCurrency, formatLongDate, formatTime } from "@/features/flights/format";

export const metadata: Metadata = {
  title: "Tu reserva — VolAR",
};

// US-15/US-17: pantalla de la reserva con hold activo (cupo retenido 10
// minutos). La carga de pasajeros y el pago son la próxima etapa del sistema.
export default async function ReservaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!idSchema("Booking").safeParse(id).success) {
    return (
      <ReservaShell>
        <Unavailable
          title="La reserva no es válida"
          description="El enlace con el que llegaste está incompleto o fue modificado."
        />
      </ReservaShell>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    const returnTo = `/compra/reserva/${id}`;
    redirect(`/sign-in?${new URLSearchParams({ redirect_url: returnTo })}`);
  }

  const booking = await getBookingHold(id, user.id);
  if (!booking) {
    return (
      <ReservaShell>
        <Unavailable
          title="No encontramos esta reserva"
          description="Puede que no exista o que no te pertenezca."
        />
      </ReservaShell>
    );
  }

  const backHref = resultsHref(booking.flight);

  if (booking.status === "EXPIRED") {
    return (
      <ReservaShell>
        <Unavailable
          title="Se agotó el tiempo para completar esta compra"
          description="Los cupos que habías retenido se liberaron. Podés volver a elegir el vuelo y confirmar de nuevo."
          backHref={backHref}
        />
      </ReservaShell>
    );
  }

  if (booking.status !== "PENDING_PAYMENT") {
    return (
      <ReservaShell>
        <Unavailable
          title="Esta reserva ya no está pendiente de pago"
          description="Consultá su estado desde tus compras."
          backHref="/vuelos"
        />
      </ReservaShell>
    );
  }

  return (
    <ReservaShell>
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Reserva {booking.code}</CardTitle>
            <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs">
              {booking.flight.code}
            </span>
          </CardHeader>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 px-6 pt-2 pb-6 sm:grid-cols-2">
            <SummaryItem label="Trayecto">
              {booking.flight.origin.city} ({booking.flight.origin.code}) →{" "}
              {booking.flight.destination.city} ({booking.flight.destination.code})
            </SummaryItem>
            <SummaryItem label="Fecha">{formatLongDate(booking.flight.date)}</SummaryItem>
            <SummaryItem label="Horario">
              {formatTime(booking.flight.departureAt)} — {formatTime(booking.flight.arrivalAt)}
            </SummaryItem>
            <SummaryItem label="Clase">{SEAT_CLASS_LABELS[booking.seatClass]}</SummaryItem>
            <SummaryItem label="Cantidad de pasajes">{booking.quantity}</SummaryItem>
            <SummaryItem label="Tarifa por pasajero">{formatCurrency(booking.unitPrice)}</SummaryItem>
          </dl>
        </Card>

        <Card className="gap-4 p-5">
          <h2 className="text-base font-extrabold">Completá el pago</h2>
          <CountdownTimer
            bookingId={booking.id}
            expiresAt={booking.holdExpiresAt.toISOString()}
            backHref={backHref}
          />
          <div className="flex items-end justify-between border-t border-dashed border-border pt-4">
            <span className="text-[13px] font-semibold text-muted-foreground">Total a pagar</span>
            <strong className="text-[28px] font-extrabold tracking-[-0.03em]">
              {formatCurrency(booking.totalAmount)}
            </strong>
          </div>

          <Alert>
            <AlertTitle>Próximo paso</AlertTitle>
            <AlertDescription>
              La carga de los datos de cada pasajero y el pago se habilitan en la próxima etapa del
              sistema. Si se agota el tiempo, los cupos se liberan automáticamente.
            </AlertDescription>
          </Alert>
        </Card>
      </div>
    </ReservaShell>
  );
}

function resultsHref(flight: BookingHold["flight"]): string {
  const params = new URLSearchParams({
    origen: flight.origin.id,
    destino: flight.destination.id,
    fecha: flight.date.toISOString().slice(0, 10),
  });
  return `/vuelos?${params}`;
}

function ReservaShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Inicio
          </Link>
          <span aria-hidden>/</span>
          <Link href="/vuelos" className="hover:text-foreground">
            Búsqueda de vuelos
          </Link>
          <span aria-hidden>/</span>
          <b className="font-semibold text-foreground">Tu reserva</b>
        </nav>

        <h1 className="text-[22px] font-extrabold tracking-[-0.035em] sm:text-[26px] lg:text-[30px]">
          Tu reserva
        </h1>

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
