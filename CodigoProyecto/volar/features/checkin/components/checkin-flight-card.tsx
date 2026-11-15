import Link from "next/link";
import { formatDate, formatTime } from "@/features/flights/format";
import type { CheckinFlightGroup } from "../queries";
import { CheckinFlightHeader } from "./checkin-flight-header";
import { CheckinForm } from "./checkin-form";

function stateMessage(group: CheckinFlightGroup): string | null {
  switch (group.state) {
    case "not-open":
      return `El check-in se habilita el ${formatDate(group.opensAt)} a las ${formatTime(group.opensAt)} hs.`;
    case "closed":
      return `El check-in de este vuelo cerró a las ${formatTime(group.boardingAt)} hs.`;
    case "unavailable":
      return "Este vuelo no está programado (fue cancelado o ya salió). Revisá el estado de tu compra en Mis Compras.";
    default:
      return null;
  }
}

// US-38: un vuelo de la reserva con su ventana de check-in (checkin_online.html).
export function CheckinFlightCard({ code, group }: { code: string; group: CheckinFlightGroup }) {
  const { flight } = group;
  const message = stateMessage(group);
  const allDone = group.passengers.every((passenger) => passenger.checkedInAt !== null);

  return (
    <section className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <CheckinFlightHeader flight={flight} boardingAt={group.boardingAt} />

      {message && (
        <p className="rounded-xl bg-muted px-3.5 py-3 text-sm text-muted-foreground">{message}</p>
      )}

      {group.state === "open" &&
        (allDone ? (
          <p className="rounded-xl bg-success-muted px-3.5 py-3 text-sm font-semibold text-success">
            Todos los pasajeros de este vuelo ya hicieron el check-in.
          </p>
        ) : (
          <>
            {/* US-37: el paso 1 del check-in es elegir los asientos. */}
            <p className="text-sm text-muted-foreground">
              {"Paso 2 de 2: confirmá el check-in. "}
              <Link
                href={`/compra/checkin/asientos?${new URLSearchParams({ reserva: code })}`}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Cambiar asientos
              </Link>
              {" · "}
              {/* US-41: equipaje adicional opcional, antes de confirmar. */}
              <Link
                href={`/compra/checkin/equipaje?${new URLSearchParams({ reserva: code })}`}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                Agregar equipaje
              </Link>
            </p>
            <CheckinForm code={code} passengers={group.passengers} />
          </>
        ))}
    </section>
  );
}
