import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { AccountShell } from "@/components/account-shell";
import { getCurrentUser } from "@/lib/auth";
import { bookingCodeSchema } from "@/features/purchase/schema";
import { getCancellationQuote } from "@/features/cancellation/queries";
import { CANCELLATION_BLOCK_MESSAGES } from "@/features/cancellation/quote";
import { CancellationSummary } from "@/features/cancellation/components/cancellation-summary";
import { CancellationForm } from "@/features/cancellation/components/cancellation-form";

export const metadata: Metadata = {
  title: "Cancelar reserva — VolAR",
};

const TITLE = "Cancelar reserva";

type SearchParams = Record<string, string | string[] | undefined>;

// US-39: cancelación voluntaria de una reserva propia (/compra/cancelar?reserva=…)
// aplicando la política de penalidades (cambio_cancelacion_pasajero.html).
export default async function CancelarPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const code = bookingCodeSchema.safeParse((await searchParams).reserva);
  if (!code.success) {
    return (
      <NotAvailable
        title="No pudimos identificar la reserva"
        description="El enlace está incompleto o fue modificado. Entrá a la cancelación desde Mis Compras."
      />
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    const returnTo = `/compra/cancelar?${new URLSearchParams({ reserva: code.data })}`;
    redirect(`/sign-in?${new URLSearchParams({ redirect_url: returnTo })}`);
  }

  // La titularidad sale solo de la sesión: una reserva ajena y una
  // inexistente muestran el mismo estado.
  const quote = await getCancellationQuote(code.data, user.id);
  if (!quote) {
    return (
      <NotAvailable
        title="No encontramos esta reserva"
        description="El código no corresponde a ninguna reserva de tu cuenta."
      />
    );
  }
  if (quote.blocked) {
    return (
      <NotAvailable
        title="Esta reserva no se puede cancelar"
        description={CANCELLATION_BLOCK_MESSAGES[quote.blocked]}
      />
    );
  }

  return (
    <AccountShell
      title={TITLE}
      description={`Reserva ${quote.code}. Cancelación voluntaria a pedido del pasajero, aplicando la política de penalidades.`}
      actions={
        <Link href="/cuenta" className={buttonVariants({ variant: "outline" })}>
          Volver a Mis Compras
        </Link>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <CancellationSummary quote={quote} />
        <CancellationForm quote={quote} />
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
