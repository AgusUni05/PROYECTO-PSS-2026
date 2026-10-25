import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { idSchema } from "@/lib/id";
import { getBookingHold, type BookingHold } from "@/features/purchase/service";
import { CountdownTimer } from "@/features/purchase/components/countdown-timer";
import { PassengersForm } from "@/features/purchase/components/passengers-form";
import {
  PurchaseShell,
  Unavailable,
} from "@/features/purchase/components/purchase-shell";
import { resultsHref } from "@/features/purchase/components/purchase-shell.utils";
import { SEAT_CLASS_LABELS } from "@/features/flight-search/class-options";
import { formatCurrency, formatLongDate, formatTime } from "@/features/flights/format";

export const metadata: Metadata = {
  title: "Datos de los pasajeros — VolAR",
};

const TITLE = "Datos de los pasajeros";

// US-15/US-17/US-18/US-19: paso 2 del flujo de compra. Con el cupo retenido
// 10 minutos (hold), se cargan los datos de cada pasajero antes de pagar.
export default async function ReservaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!idSchema("Booking").safeParse(id).success) {
    return (
      <PurchaseShell title={TITLE} currentStep={2}>
        <Unavailable
          title="La reserva no es válida"
          description="El enlace con el que llegaste está incompleto o fue modificado."
        />
      </PurchaseShell>
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
      <PurchaseShell title={TITLE} currentStep={2}>
        <Unavailable
          title="No encontramos esta reserva"
          description="Puede que no exista o que no te pertenezca."
        />
      </PurchaseShell>
    );
  }

  const backHref = resultsHref(booking.flight);

  if (booking.status === "EXPIRED") {
    return (
      <PurchaseShell title={TITLE} currentStep={2}>
        <Unavailable
          title="Se agotó el tiempo para completar esta compra"
          description="Los cupos que habías retenido se liberaron. Podés volver a elegir el vuelo y confirmar de nuevo."
          backHref={backHref}
        />
      </PurchaseShell>
    );
  }

  if (booking.status !== "PENDING_PAYMENT") {
    return (
      <PurchaseShell title={TITLE} currentStep={2}>
        <Unavailable
          title="Esta reserva ya no está pendiente de pago"
          description="Consultá su estado desde tus compras."
        />
      </PurchaseShell>
    );
  }

  return (
    <PurchaseShell title={TITLE} currentStep={2}>
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
        <PassengersForm
          bookingId={booking.id}
          quantity={booking.quantity}
          initialPassengers={booking.passengers}
        />
        <BookingSummary booking={booking} backHref={backHref} />
      </div>
    </PurchaseShell>
  );
}

function BookingSummary({ booking, backHref }: { booking: BookingHold; backHref: string }) {
  const { flight } = booking;

  return (
    <Card className="gap-4 p-5 md:sticky md:top-6">
      <CountdownTimer
        bookingId={booking.id}
        expiresAt={booking.holdExpiresAt.toISOString()}
        backHref={backHref}
      />

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-extrabold">Reserva {booking.code}</h2>
        <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs">{flight.code}</span>
      </div>

      <dl className="space-y-3 text-sm">
        <SummaryItem label="Trayecto">
          {flight.origin.city} ({flight.origin.code}) → {flight.destination.city} (
          {flight.destination.code})
        </SummaryItem>
        <SummaryItem label="Fecha">{formatLongDate(flight.date)}</SummaryItem>
        <SummaryItem label="Horario">
          {formatTime(flight.departureAt)} — {formatTime(flight.arrivalAt)}
        </SummaryItem>
        <SummaryItem label="Clase">{SEAT_CLASS_LABELS[booking.seatClass]}</SummaryItem>
      </dl>

      <div className="space-y-2 border-t border-dashed border-border pt-4 text-sm text-muted-foreground">
        <div className="flex justify-between">
          <span>Tarifa por pasajero</span>
          <b className="text-foreground">{formatCurrency(booking.unitPrice)}</b>
        </div>
        <div className="flex justify-between">
          <span>Cantidad de pasajes</span>
          <b className="text-foreground">× {booking.quantity}</b>
        </div>
      </div>
      <div className="flex items-end justify-between border-t border-border pt-4">
        <span className="text-[13px] font-semibold text-muted-foreground">Total a pagar</span>
        <strong className="text-[28px] font-extrabold tracking-[-0.03em]">
          {formatCurrency(booking.totalAmount)}
        </strong>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Si se agota el tiempo, los cupos se liberan automáticamente.
      </p>
    </Card>
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
