import { formatDate, formatLongDate, formatTime } from "@/features/flights/format";
import type { CheckinFlightGroup } from "../queries";
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
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">{flight.code}</p>
          <h2 className="text-lg font-extrabold break-words">
            {`${flight.origin.city} (${flight.origin.code}) → ${flight.destination.city} (${flight.destination.code})`}
          </h2>
          <p className="text-sm text-muted-foreground">{formatLongDate(flight.date)}</p>
        </div>
        <dl className="flex gap-5 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Embarque</dt>
            <dd className="font-extrabold">{`${formatTime(group.boardingAt)} hs`}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Salida</dt>
            <dd className="font-extrabold">{`${formatTime(flight.departureAt)} hs`}</dd>
          </div>
        </dl>
      </header>

      {message && (
        <p className="rounded-xl bg-muted px-3.5 py-3 text-sm text-muted-foreground">{message}</p>
      )}

      {group.state === "open" &&
        (allDone ? (
          <p className="rounded-xl bg-success-muted px-3.5 py-3 text-sm font-semibold text-success">
            Todos los pasajeros de este vuelo ya hicieron el check-in.
          </p>
        ) : (
          <CheckinForm code={code} passengers={group.passengers} />
        ))}
    </section>
  );
}
