import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { AccountShell } from "@/components/account-shell";
import { getCurrentUser } from "@/lib/auth";
import { bookingCodeSchema } from "@/features/purchase/schema";
import { getCheckinView } from "@/features/checkin/queries";
import { BaggageForm } from "@/features/baggage/components/baggage-form";

export const metadata: Metadata = {
  title: "Equipaje adicional — VolAR",
};

const TITLE = "Equipaje adicional";

type SearchParams = Record<string, string | string[] | undefined>;

// US-41: valijas adicionales en bodega durante el check-in online
// (/compra/checkin/equipaje?reserva=…). Paso opcional antes de confirmar.
export default async function EquipajePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
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
    const returnTo = `/compra/checkin/equipaje?${new URLSearchParams({ reserva: code.data })}`;
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

  // Solo pasajeros con la ventana abierta que todavía no confirmaron el
  // check-in. Si no hay ninguno, el check-in muestra el estado que corresponde.
  const passengers =
    view.status === "CONFIRMED"
      ? view.groups
          .filter((group) => group.state === "open")
          .flatMap((group) =>
            group.passengers
              .filter((passenger) => passenger.checkedInAt === null)
              .map((passenger) => ({ ...passenger, flightCode: group.flight.code })),
          )
      : [];
  if (passengers.length === 0) redirect(checkinHref);

  return (
    <AccountShell
      title={TITLE}
      description={`Reserva ${view.code}. Agregá valijas en bodega antes de confirmar el check-in.`}
      actions={
        <Link href={checkinHref} className={buttonVariants({ variant: "outline" })}>
          Volver al check-in
        </Link>
      }
    >
      <BaggageForm code={view.code} passengers={passengers} />
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
