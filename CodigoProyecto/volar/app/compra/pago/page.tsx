import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { SEAT_CLASS_LABELS } from "@/features/flight-search/class-options";
import { formatCurrency, formatLongDate, formatTime } from "@/features/flights/format";
import { bookingCodeSchema } from "@/features/purchase/schema";
import {
  getBookingForPayment,
  isHoldExpired,
  type BookingForPayment,
} from "@/features/purchase/queries";
import { PaymentForm } from "@/features/purchase/components/payment-form";
import { CountdownTimer } from "@/features/purchase/components/countdown-timer";
import {
  PurchaseShell,
  Unavailable,
} from "@/features/purchase/components/purchase-shell";
import { resultsHref } from "@/features/purchase/components/purchase-shell.utils";

export const metadata: Metadata = {
  title: "Pago de la compra — VolAR",
};

type SearchParams = Record<string, string | string[] | undefined>;

// US-20/US-21: pantalla de pago de una reserva existente (/compra/pago?reserva=…).
// Los datos de pasajeros (US-15..19) son la etapa previa, a la que se puede
// volver para editarlos mientras siga el hold; acá se ingresa el pago y se lo
// procesa contra la pasarela simulada. La emisión de comprobantes (US-23/24)
// es la etapa siguiente.
export default async function PagoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const code = bookingCodeSchema.safeParse((await searchParams).reserva);

  if (!code.success) {
    return (
      <PurchaseShell title="Pago de la compra" currentStep={3}>
        <Unavailable
          title="No pudimos identificar la reserva"
          description="El enlace con el que llegaste está incompleto o fue modificado. Iniciá la compra de nuevo."
        />
      </PurchaseShell>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    const returnTo = `/compra/pago?${new URLSearchParams({ reserva: code.data })}`;
    redirect(`/sign-in?${new URLSearchParams({ redirect_url: returnTo })}`);
  }

  const booking = await getBookingForPayment(code.data, user.id);
  if (!booking) {
    return (
      <PurchaseShell title="Pago de la compra" currentStep={3}>
        <Unavailable
          title="No encontramos esta reserva"
          description="El código no corresponde a una reserva disponible para esta cuenta. Iniciá la compra de nuevo."
        />
      </PurchaseShell>
    );
  }

  if (booking.status === "CONFIRMED") {
    const comprobantes = `/compra/comprobantes?${new URLSearchParams({ reserva: booking.code })}`;
    return (
      <PurchaseShell title="Pago de la compra" currentStep={3}>
        <Card className="gap-4 p-5">
          <h2 className="text-[17px] font-extrabold">Esta reserva ya está pagada</h2>
          <p className="text-[13px] text-muted-foreground">
            La compra {booking.code} quedó confirmada y ya se emitieron los e-tickets y la factura.
          </p>
          <Link href={comprobantes} className={buttonVariants()}>
            Ver comprobantes
          </Link>
        </Card>
      </PurchaseShell>
    );
  }

  const closed = closedBookingMessage(booking);
  if (closed) {
    return (
      <PurchaseShell title="Pago de la compra" currentStep={3}>
        <Unavailable title={closed.title} description={closed.description} />
      </PurchaseShell>
    );
  }

  // US-19: no se llega al pago sin los datos de todos los pasajeros.
  if (booking.passengers.length !== booking.quantity) {
    redirect(`/compra/reserva/${booking.id}`);
  }

  return (
    <PurchaseShell title="Pago de la compra" currentStep={3}>
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
        <PaymentForm bookingCode={booking.code} total={Number(booking.totalAmount)} />
        <PaymentSummary booking={booking} />
      </div>
    </PurchaseShell>
  );
}

/** Motivo por el que la reserva ya no admite pago (null si todavía se puede pagar). */
function closedBookingMessage(booking: BookingForPayment): { title: string; description: string } | null {
  if (booking.status === "REJECTED") {
    return {
      title: "El pago de esta reserva fue rechazado",
      description: "Se liberó el cupo reservado. Iniciá la compra de nuevo para volver a intentarlo.",
    };
  }
  if (booking.status === "EXPIRED") {
    return {
      title: "La reserva venció",
      description: "Se agotó el tiempo para completar el pago. Iniciá la compra de nuevo.",
    };
  }
  if (booking.status === "CANCELLED") {
    return {
      title: "La reserva fue cancelada",
      description: "Esta compra ya no se puede pagar. Iniciá una nueva compra.",
    };
  }
  if (isHoldExpired(booking.holdExpiresAt, new Date())) {
    return {
      title: "Se agotó el tiempo para pagar",
      description: "La retención de cupo dura 10 minutos. Iniciá la compra de nuevo.",
    };
  }
  return null;
}

function PaymentSummary({ booking }: { booking: BookingForPayment }) {
  const { flight } = booking;
  const unitPrice = Number(booking.unitPrice);
  const total = Number(booking.totalAmount);

  return (
    <Card className="gap-4 p-5 md:sticky md:top-6">
      <CountdownTimer
        bookingId={booking.id}
        expiresAt={booking.holdExpiresAt.toISOString()}
        backHref={resultsHref(flight)}
      />

      <h2 className="text-base font-extrabold">Resumen de Cargo</h2>

      <div className="space-y-1 text-sm">
        <div>
          <span className="text-muted-foreground">Vuelo: </span>
          <b>{flight.code}</b> ({flight.origin.code} → {flight.destination.code})
        </div>
        <div>
          <span className="text-muted-foreground">Fecha: </span>
          {formatLongDate(flight.date)} · {formatTime(flight.departureAt)} hs
        </div>
        <div>
          <span className="text-muted-foreground">Pasajeros: </span>
          {booking.quantity} {booking.quantity === 1 ? "persona" : "personas"} (
          {SEAT_CLASS_LABELS[booking.seatClass]})
        </div>
      </div>

      <ul className="list-none space-y-1 rounded-xl bg-muted px-3 py-2 text-[13px]">
        {booking.passengers.map((passenger) => (
          <li key={passenger.id} className="flex justify-between gap-3">
            <span>
              {passenger.lastName}, {passenger.firstName}
            </span>
            <span className="text-muted-foreground">
              {passenger.documentType === "DNI" ? "DNI" : "Pasaporte"} {passenger.documentNumber}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href={`/compra/reserva/${booking.id}`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        ← Volver a Pasajeros para editar
      </Link>

      <div className="space-y-2 border-t border-dashed border-border pt-3 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>
            Tarifa ({formatCurrency(unitPrice)} × {booking.quantity})
          </span>
          <span>{formatCurrency(unitPrice * booking.quantity)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Cargos Administrativos</span>
          <span>{formatCurrency(0)}</span>
        </div>
      </div>

      <div className="flex items-end justify-between border-t border-border pt-4">
        <span className="text-[13px] font-semibold text-muted-foreground">IMPORTE TOTAL</span>
        <strong className="text-[28px] font-extrabold tracking-[-0.03em]">
          {formatCurrency(total)}
        </strong>
      </div>
    </Card>
  );
}
