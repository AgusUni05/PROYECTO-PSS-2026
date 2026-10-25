import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatTime } from "@/features/flights/format";
import { bookingCodeSchema } from "@/features/purchase/schema";
import { getBookingComprobantesForBuyer, type PurchaseComprobantes } from "@/features/purchase/queries";
import { PurchaseShell, Unavailable } from "@/features/purchase/components/purchase-shell";
import { PurchaseDownloadActions } from "@/features/purchase/components/purchase-download-actions";
import { ETicketCard } from "@/features/purchase/components/e-ticket-card";
import { InvoiceSection } from "@/features/purchase/components/invoice-section";

export const metadata: Metadata = {
  title: "Comprobantes de la compra — VolAR",
};

type SearchParams = Record<string, string | string[] | undefined>;

// US-23/US-24: comprobantes de una compra confirmada
// (/compra/comprobantes?reserva=…). Es el paso 4 del flujo de compra.
export default async function ComprobantesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const code = bookingCodeSchema.safeParse((await searchParams).reserva);

  if (!code.success) {
    return (
      <PurchaseShell title="Comprobantes de la compra" currentStep={4}>
        <Unavailable
          title="No pudimos identificar la reserva"
          description="El enlace con el que llegaste está incompleto o fue modificado. Iniciá la compra de nuevo."
        />
      </PurchaseShell>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    const returnTo = `/compra/comprobantes?${new URLSearchParams({ reserva: code.data })}`;
    redirect(`/sign-in?${new URLSearchParams({ redirect_url: returnTo })}`);
  }

  // I2: la titularidad se resuelve solo con la sesión. Un comprador distinto
  // obtiene el mismo estado "no encontrado" que un código inexistente.
  const booking = await getBookingComprobantesForBuyer(code.data, user.id);
  if (!booking) {
    return (
      <PurchaseShell title="Comprobantes de la compra" currentStep={4}>
        <Unavailable
          title="No encontramos esta reserva"
          description="El código no corresponde a ninguna reserva registrada."
        />
      </PurchaseShell>
    );
  }

  if (booking.status !== "CONFIRMED") {
    return (
      <PurchaseShell title="Comprobantes de la compra" currentStep={4}>
        <Unavailable
          title="Esta compra todavía no tiene comprobantes"
          description={`La reserva ${booking.code} no está confirmada. Los comprobantes se emiten al aprobarse el pago.`}
        />
      </PurchaseShell>
    );
  }

  // I3: un pasaje reembolsado o cancelado no cuenta ni se muestra como emitido.
  const issuedTickets = booking.tickets.filter((ticket) => ticket.status === "ISSUED");

  return (
    <PurchaseShell title="Comprobantes de la compra" currentStep={4}>
      <ConfirmationHeader booking={booking} />
      <EmailNotice booking={booking} />

      <section className="space-y-3">
        <h2 className="border-b border-border pb-2 text-[15px] font-extrabold">
          Pasajes electrónicos emitidos ({issuedTickets.length})
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {issuedTickets.map((ticket, index) => (
            <ETicketCard key={ticket.id} ticket={ticket} index={index} />
          ))}
        </div>
      </section>

      <InvoiceSection booking={booking} />

      <section className="min-w-0 space-y-2">
        <h2 className="border-b border-border pb-2 text-[15px] font-extrabold">
          Documentación de la compra
        </h2>
        <p className="text-sm text-muted-foreground">
          Descargá los e-tickets y la factura en PDF.
        </p>
        <PurchaseDownloadActions
          code={booking.code}
          ticketCount={issuedTickets.length}
          hasInvoice={booking.invoice !== null}
          canDownload
        />
      </section>

      <div className="flex justify-end">
        <Link href="/" className={buttonVariants()}>
          Finalizar y volver al inicio
        </Link>
      </div>
    </PurchaseShell>
  );
}

function ConfirmationHeader({ booking }: { booking: PurchaseComprobantes }) {
  return (
    <section className="rounded-2xl border-2 border-foreground bg-muted/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-extrabold">¡Compra confirmada! Pasajes emitidos</h2>
          <p className="text-[13px] font-semibold">
            Código de reserva: <b>{booking.code}</b>
          </p>
        </div>
        <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
          Pagado y emitido
        </span>
      </div>
      {booking.confirmedAt && (
        <p className="mt-2 text-xs text-muted-foreground">
          Confirmada el {formatDate(booking.confirmedAt)} a las {formatTime(booking.confirmedAt)} hs
          {booking.transactionId && <> · Transacción {booking.transactionId}</>}
        </p>
      )}
    </section>
  );
}

function EmailNotice({ booking }: { booking: PurchaseComprobantes }) {
  return (
    <Alert className="rounded-2xl">
      <AlertTitle>Comprobantes enviados por correo</AlertTitle>
      <AlertDescription className="space-y-1">
        <p>
          Se enviaron los {booking.tickets.length} e-tickets y la factura a{" "}
          <b>{booking.email?.recipientEmail ?? booking.contactEmail}</b>.
        </p>
        {booking.email?.sentAt && (
          <p className="text-xs text-muted-foreground">
            Enviado el {formatDate(booking.email.sentAt)} a las {formatTime(booking.email.sentAt)} hs
            (RNF-02).
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}

