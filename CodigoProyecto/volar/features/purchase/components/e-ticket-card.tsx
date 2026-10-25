import { SEAT_CLASS_LABELS } from "@/features/flight-search/class-options";
import { formatDate, formatTime } from "@/features/flights/format";
import type { ComprobanteTicket } from "../queries";

// US-23/US-33/US-34: tarjeta de un e-ticket emitido (pasajero, ruta, fecha, asiento).
export function ETicketCard({ ticket, index }: { ticket: ComprobanteTicket; index: number }) {
  const { flight } = ticket;

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[13px] font-extrabold">E-TICKET #{index + 1}</span>
          <div className="text-xs text-muted-foreground">Vuelo: {flight.code}</div>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
          {SEAT_CLASS_LABELS[ticket.seatClass]}
        </span>
      </div>

      <dl className="mt-3 space-y-1 text-[13px]">
        <TicketRow label="Pasajero">
          <b>
            {ticket.lastName}, {ticket.firstName}
          </b>
        </TicketRow>
        <TicketRow label="Documento">
          {ticket.documentType === "DNI" ? "DNI" : "Pasaporte"} {ticket.documentNumber}
        </TicketRow>
        <TicketRow label="Ruta">
          <b>
            {flight.origin.code} → {flight.destination.code}
          </b>
        </TicketRow>
        <TicketRow label="Fecha">
          {formatDate(flight.date)} · {formatTime(flight.departureAt)} hs
        </TicketRow>
        <TicketRow label="Asiento">
          <b>{ticket.seat ?? "—"}</b>
        </TicketRow>
      </dl>

      <p className="mt-3 border-t border-dashed border-border pt-2 font-mono text-xs text-muted-foreground">
        {ticket.number ?? ""}
      </p>
    </article>
  );
}

function TicketRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
