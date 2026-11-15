import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, formatTime } from "@/features/flights/format";
import { checkinOpensAt } from "@/features/checkin/window";
import type { PurchaseHistoryFlight, PurchaseHistoryTicket } from "@/features/purchase/history";

/**
 * US-38: estado del check-in online de un vuelo de la compra en Mis Compras.
 * La ventana viene calculada desde la consulta (`flight.checkinState`).
 */
export function PurchaseCheckinStatus({
  code,
  flight,
  tickets,
}: {
  code: string;
  flight: PurchaseHistoryFlight;
  tickets: PurchaseHistoryTicket[];
}) {
  const issued = tickets.filter((ticket) => ticket.status === "ISSUED");
  if (issued.length === 0 || flight.checkinState === "unavailable") return null;

  const checkedIn = issued.filter((ticket) => ticket.checkedInAt !== null).length;
  const query = new URLSearchParams({ reserva: code });
  const href = `/compra/checkin?${query}`;

  if (flight.checkinState === "not-open") {
    const opensAt = checkinOpensAt(flight.departureAt);
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        {`Check-in online desde el ${formatDate(opensAt)} a las ${formatTime(opensAt)} hs`}
      </p>
    );
  }

  if (flight.checkinState === "open" && checkedIn < issued.length) {
    // US-37: el check-in arranca por la elección de asientos (paso 1).
    return (
      <Link
        href={`/compra/checkin/asientos?${query}`}
        className={buttonVariants({ size: "sm", className: "mt-2 min-h-9" })}
      >
        Hacer check-in
      </Link>
    );
  }

  if (checkedIn > 0) {
    return (
      <Link
        href={href}
        className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2 min-h-9" })}
      >
        Ver tarjetas de embarque
      </Link>
    );
  }

  return <p className="mt-2 text-xs text-muted-foreground">El check-in online cerró.</p>;
}
