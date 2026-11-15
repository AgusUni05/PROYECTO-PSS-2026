import { formatLongDate, formatTime } from "@/features/flights/format";
import type { CheckinFlightGroup } from "../queries";

// US-38/US-37: vuelo, ruta, fecha, embarque y salida, arriba de cada paso del check-in.
export function CheckinFlightHeader({
  flight,
  boardingAt,
}: {
  flight: CheckinFlightGroup["flight"];
  boardingAt: Date;
}) {
  return (
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
          <dd className="font-extrabold">{`${formatTime(boardingAt)} hs`}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Salida</dt>
          <dd className="font-extrabold">{`${formatTime(flight.departureAt)} hs`}</dd>
        </div>
      </dl>
    </header>
  );
}
