import type { SeatClass } from "@/generated/prisma/enums";
import { SEAT_CLASS_LABELS } from "@/features/flight-search/class-options";
import { formatLongDate, formatTime } from "@/features/flights/format";
import type { PurchaseHistoryFlight } from "@/features/purchase/history";

/**
 * US-35: resumen de un vuelo de la compra. Sin acciones: los botones viven en
 * la tarjeta para que este bloque se pueda reutilizar en el historial.
 */
export function PurchaseSummary({
  flight,
  ticketCount,
  seatClass,
}: {
  flight: PurchaseHistoryFlight;
  ticketCount: number;
  seatClass: SeatClass;
}) {
  const passengerCount = ticketCount === 1 ? "1 pasaje" : `${ticketCount} pasajes`;

  return (
    <div className="min-w-0 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-mono text-xs font-semibold break-words">{flight.code}</span>
        <span className="text-xs text-muted-foreground">{formatLongDate(flight.date)}</span>
      </div>

      <p className="mt-2 flex flex-wrap items-baseline gap-2 text-[15px] font-extrabold break-words">
        <span>{flight.origin.code}</span>
        <span aria-hidden>→</span>
        <span>{flight.destination.code}</span>
      </p>
      <p className="text-xs text-muted-foreground break-words">
        {`${flight.origin.city} → ${flight.destination.city}`}
      </p>

      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
        <div className="min-w-0">
          <dt className="text-muted-foreground">Salida</dt>
          <dd className="font-semibold">{formatTime(flight.departureAt)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Llegada</dt>
          <dd className="font-semibold">{formatTime(flight.arrivalAt)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Clase</dt>
          <dd className="font-semibold break-words">{SEAT_CLASS_LABELS[seatClass]}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Pasajes</dt>
          <dd className="font-semibold">{passengerCount}</dd>
        </div>
      </dl>
    </div>
  );
}
