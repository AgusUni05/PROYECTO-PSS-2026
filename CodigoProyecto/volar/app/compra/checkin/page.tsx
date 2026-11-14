import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { AccountShell } from "@/components/account-shell";
import { getCurrentUser } from "@/lib/auth";
import { bookingCodeSchema } from "@/features/purchase/schema";
import { purchaseDocumentUrl } from "@/features/purchase/components/purchase-download-actions.utils";
import { getCheckinView } from "@/features/checkin/queries";
import { CheckinFlightCard } from "@/features/checkin/components/checkin-flight-card";

export const metadata: Metadata = {
  title: "Check-in online — VolAR",
};

const TITLE = "Check-in online";

type SearchParams = Record<string, string | string[] | undefined>;

// US-38: check-in online de una reserva propia (/compra/checkin?reserva=…),
// con la descarga de las tarjetas de embarque (checkin_online.html).
export default async function CheckinPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const code = bookingCodeSchema.safeParse((await searchParams).reserva);
  if (!code.success) {
    return (
      <NotAvailable
        title="No pudimos identificar la reserva"
        description="El enlace está incompleto o fue modificado. Entrá al check-in desde Mis Compras."
      />
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    const returnTo = `/compra/checkin?${new URLSearchParams({ reserva: code.data })}`;
    redirect(`/sign-in?${new URLSearchParams({ redirect_url: returnTo })}`);
  }

  // La titularidad sale solo de la sesión: una reserva ajena y una
  // inexistente muestran el mismo estado.
  const view = await getCheckinView(code.data, user.id);
  if (!view) {
    return (
      <NotAvailable
        title="No encontramos esta reserva"
        description="El código no corresponde a ninguna reserva de tu cuenta."
      />
    );
  }
  if (view.status !== "CONFIRMED") {
    return (
      <NotAvailable
        title="Esta compra no está confirmada"
        description={`La reserva ${view.code} no tiene pasajes emitidos para hacer el check-in.`}
      />
    );
  }

  const checkedIn = view.groups
    .flatMap((group) => group.passengers)
    .filter((passenger) => passenger.checkedInAt !== null).length;

  return (
    <AccountShell
      title={TITLE}
      description={`Reserva ${view.code}. El check-in abre 24 horas antes de la salida y cierra a la hora de embarque.`}
      actions={
        <Link href="/cuenta" className={buttonVariants({ variant: "outline" })}>
          Volver a Mis Compras
        </Link>
      }
    >
      <div className="grid gap-4">
        {checkedIn > 0 && (
          <a
            href={purchaseDocumentUrl(view.code, "boarding-passes")}
            download
            className={buttonVariants({ className: "min-h-11 w-full justify-center sm:w-fit" })}
          >
            {`Descargar tarjetas de embarque (${checkedIn} PDF)`}
          </a>
        )}
        {view.groups.length === 0 && (
          <p className="text-sm text-muted-foreground">Esta reserva no tiene pasajes activos.</p>
        )}
        {view.groups.map((group) => (
          <CheckinFlightCard key={group.flight.id} code={view.code} group={group} />
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
