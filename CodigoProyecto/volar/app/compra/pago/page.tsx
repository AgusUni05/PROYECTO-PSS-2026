import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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

export const metadata: Metadata = {
  title: "Pago de la compra — VolAR",
};

type SearchParams = Record<string, string | string[] | undefined>;

// US-20/US-21: pantalla de pago de una reserva existente (/compra/pago?reserva=…).
// Los datos de pasajeros (US-15..19) son la etapa previa; acá se ingresa el
// pago y se lo procesa contra la pasarela simulada. La emisión de comprobantes
// (US-23/24) es la etapa siguiente.
export default async function PagoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const code = bookingCodeSchema.safeParse((await searchParams).reserva);

  if (!code.success) {
    return (
      <PurchaseShell>
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

  const booking = await getBookingForPayment(code.data);
  if (!booking) {
    return (
      <PurchaseShell>
        <Unavailable
          title="No encontramos esta reserva"
          description="El código no corresponde a ninguna reserva registrada. Iniciá la compra de nuevo."
        />
      </PurchaseShell>
    );
  }

  const closed = closedBookingMessage(booking);
  if (closed) {
    return (
      <PurchaseShell>
        <Unavailable title={closed.title} description={closed.description} />
      </PurchaseShell>
    );
  }

  return (
    <PurchaseShell>
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
        <PaymentForm bookingCode={booking.code} total={Number(booking.totalAmount)} />
        <PaymentSummary booking={booking} />
      </div>
    </PurchaseShell>
  );
}

/** Motivo por el que la reserva ya no admite pago (null si todavía se puede pagar). */
function closedBookingMessage(booking: BookingForPayment): { title: string; description: string } | null {
  if (booking.status === "CONFIRMED") {
    return {
      title: "Esta reserva ya está pagada",
      description: `La compra ${booking.code} está confirmada. Los e-tickets y la factura se emiten en la próxima etapa del sistema.`,
    };
  }
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
    <Card className="gap-4 p-5">
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
        {booking.passengers.map((passenger, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span>
              {passenger.lastName}, {passenger.firstName}
            </span>
            <span className="text-muted-foreground">
              {passenger.documentType === "DNI" ? "DNI" : "Pasaporte"} {passenger.documentNumber}
            </span>
          </li>
        ))}
      </ul>

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

function PurchaseShell({ children }: { children: React.ReactNode }) {
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
          <b className="font-semibold text-foreground">Pago de la compra</b>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <h1 className="text-[22px] font-extrabold tracking-[-0.035em] sm:text-[26px] lg:text-[30px]">
            Pago de la compra
          </h1>
          <ol className="flex list-none items-center gap-1.5 p-0 text-[11px] font-bold text-muted-foreground sm:gap-2.5 sm:text-[13px]">
            <Step n={1} label="Selección" done />
            <StepLine />
            <Step n={2} label="Pasajeros" done />
            <StepLine />
            <Step n={3} label="Pago" active />
            <StepLine />
            <Step n={4} label="Comprobantes" />
          </ol>
        </div>

        {children}
      </main>
    </div>
  );
}

function Step({
  n,
  label,
  active = false,
  done = false,
}: {
  n: number;
  label: string;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <li className={cn("flex items-center gap-2", (active || done) && "text-foreground")}>
      <span
        className={cn(
          "grid size-7 place-items-center rounded-full border-[1.5px] border-[#D6D4E2] bg-card text-xs",
          done && "border-primary bg-secondary text-foreground",
          active && "border-primary bg-primary text-primary-foreground shadow-[0_0_0_5px_var(--secondary)]",
        )}
      >
        {done ? "✓" : n}
      </span>
      {label}
    </li>
  );
}

function StepLine() {
  return <span aria-hidden className="h-0.5 w-4 rounded-full bg-[#DCDAE8] sm:w-9" />;
}

function Unavailable({ title, description }: { title: string; description: string }) {
  return (
    <Alert variant="destructive" className="rounded-2xl p-5">
      <AlertTitle className="text-[15px]">{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{description}</p>
        <Link href="/vuelos" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Volver a buscar
        </Link>
      </AlertDescription>
    </Alert>
  );
}
