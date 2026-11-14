import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { AccountShell } from "@/components/account-shell";
import { getCurrentUser } from "@/lib/auth";
import { formatLongDate } from "@/features/flights/format";
import { bookingCodeSchema } from "@/features/purchase/schema";
import { CANCELLATION_BLOCK_MESSAGES } from "@/features/cancellation/quote";
import { getChangeView } from "@/features/date-change/queries";
import { ChangeFlightList } from "@/features/date-change/components/change-flight-list";
import { ChangeBreakdown } from "@/features/date-change/components/change-breakdown";
import { ChangePaymentForm } from "@/features/date-change/components/change-payment-form";

export const metadata: Metadata = {
  title: "Cambiar fecha — VolAR",
};

const TITLE = "Cambiar fecha";

type SearchParams = Record<string, string | string[] | undefined>;

// US-39: cambio voluntario de fecha de una reserva propia
// (/compra/cambiar?reserva=…&vuelo=…), cambio_cancelacion_pasajero.html.
export default async function CambiarPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const code = bookingCodeSchema.safeParse(sp.reserva);
  const selectedFlightId = typeof sp.vuelo === "string" ? sp.vuelo : undefined;

  if (!code.success) {
    return (
      <NotAvailable
        title="No pudimos identificar la reserva"
        description="El enlace está incompleto o fue modificado. Entrá al cambio de fecha desde Mis Compras."
      />
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    const returnTo = `/compra/cambiar?${new URLSearchParams({ reserva: code.data })}`;
    redirect(`/sign-in?${new URLSearchParams({ redirect_url: returnTo })}`);
  }

  // La titularidad sale solo de la sesión: una reserva ajena y una
  // inexistente muestran el mismo estado.
  const view = await getChangeView(code.data, user.id, selectedFlightId);
  if (!view) {
    return (
      <NotAvailable
        title="No encontramos esta reserva"
        description="El código no corresponde a ninguna reserva de tu cuenta."
      />
    );
  }
  if (view.blocked) {
    return (
      <NotAvailable title="Esta reserva no se puede cambiar" description={CANCELLATION_BLOCK_MESSAGES[view.blocked]} />
    );
  }
  if (view.candidates.length === 0) {
    return (
      <NotAvailable
        title="No hay vuelos para cambiar"
        description="No hay otros vuelos de esta ruta a la venta con cupo para todos los pasajeros."
      />
    );
  }

  const current = view.booking.tickets[0].flight;

  return (
    <AccountShell
      title={TITLE}
      description={`Reserva ${view.booking.code}. Vuelo actual: ${current.code} del ${formatLongDate(current.date)} (${current.origin.code} → ${current.destination.code}).`}
      actions={
        <Link href="/cuenta" className={buttonVariants({ variant: "outline" })}>
          Volver a Mis Compras
        </Link>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <ChangeFlightList
          code={view.booking.code}
          candidates={view.candidates}
          selectedId={view.selected?.candidate.id ?? null}
        />
        <div className="grid grid-cols-1 gap-4">
          {view.selected ? (
            <>
              <ChangeBreakdown quote={view.selected.quote} />
              <ChangePaymentForm
                code={view.booking.code}
                flightId={view.selected.candidate.id}
                quote={view.selected.quote}
              />
            </>
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Elegí un vuelo para ver el desglose del cambio y el adicional a abonar.
            </p>
          )}
        </div>
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
