import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ETicketCard } from "@/features/purchase/components/e-ticket-card";
import { InvoiceSection } from "@/features/purchase/components/invoice-section";
import { formatCurrency, formatDate, formatTime } from "@/features/flights/format";
import type { PurchaseComprobantes } from "@/features/purchase/queries";

// US-34: detalle de una reserva localizada. Muestra itinerario, pasajes y
// factura; nunca datos bancarios (RNF-08: `getBookingComprobantes` ya no los
// trae, así que no hay nada que ocultar acá además de no pedirlos).
export function ReservationDetail({ booking }: { booking: PurchaseComprobantes }) {
  const issuedTickets = booking.tickets.filter((t) => t.status === "ISSUED");
  const flight = booking.flight;

  return (
    <div className="space-y-5">
      <Alert>
        <AlertTitle>🔒 Privacidad y seguridad bancaria (RNF-08)</AlertTitle>
        <AlertDescription>
          Esta vista muestra itinerario, e-tickets y estado del pago, pero nunca números de tarjeta ni
          datos financieros sensibles.
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-foreground p-4">
        <div>
          <span className="text-lg font-extrabold">Reserva: {booking.code}</span>
          <div className="text-sm text-muted-foreground">
            {flight.origin.code} → {flight.destination.code} · {formatDate(flight.date)} · Salida{" "}
            {formatTime(flight.departureAt)} hs · Total {formatCurrency(booking.totalAmount)}
          </div>
        </div>
        <Badge variant={booking.status === "CONFIRMED" ? "success" : "secondary"}>{booking.status}</Badge>
      </div>

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
    </div>
  );
}
