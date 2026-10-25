import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency } from "@/features/flights/format";
import type {
  PendingPurchaseContingency,
  PurchaseHistoryEntry,
  PurchaseHistoryTicket,
} from "@/features/purchase/history";
import type { TicketStatus } from "@/generated/prisma/enums";
import { PurchaseDownloadActions } from "./purchase-download-actions";
import { PurchaseStatus } from "./purchase-status";
import { groupTicketsByFlight } from "./purchase-summary.utils";
import { PurchaseSummary } from "./purchase-summary";

const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  PENDING: "Pendiente de emisión",
  ISSUED: "Emitido",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

function documentLabel(ticket: PurchaseHistoryTicket): string {
  return ticket.documentType === "DNI" ? "DNI" : "Pasaporte";
}

/**
 * US-35 + US-26: alertas accionables de las contingencias pendientes de una
 * compra. El token de acceso solo viaja en el href: nunca se imprime como
 * texto ni se expone en atributos accesibles.
 */
export function PurchaseContingencyAlerts({ entry }: { entry: PurchaseHistoryEntry }) {
  if (entry.pendingContingencies.length === 0) return null;

  const ticketById = new Map(entry.tickets.map((ticket) => [ticket.id, ticket]));

  return (
    <div className="mt-4 grid gap-2">
      {entry.pendingContingencies.map((contingency) => {
        const ticket = ticketById.get(contingency.ticketId);
        return (
          <ContingencyAlert key={contingency.accessToken} contingency={contingency} ticket={ticket} />
        );
      })}
    </div>
  );
}

function ContingencyAlert({
  contingency,
  ticket,
}: {
  contingency: PendingPurchaseContingency;
  ticket?: PurchaseHistoryTicket;
}) {
  const title =
    contingency.type === "CANCELLATION" ? "Vuelo cancelado" : "Cambio de horario";
  const passenger = ticket ? `${ticket.lastName}, ${ticket.firstName}` : null;

  return (
    <Alert variant="destructive" className="min-w-0 rounded-xl">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-2 break-words">
        <p>
          {passenger
            ? `El pasaje de ${passenger} necesita que elijas cómo continuar.`
            : "Uno de tus pasajes necesita que elijas cómo continuar."}
        </p>
        <Link
          href={`/contingencia/${contingency.accessToken}`}
          className={buttonVariants({ size: "sm" })}
        >
          Gestionar reprogramación o reembolso
        </Link>
      </AlertDescription>
    </Alert>
  );
}

/**
 * US-35: tarjeta de una compra próxima o activa. Agrupa por vuelo vigente de
 * cada pasaje (pueden diferir por una reprogramación de US-26).
 */
export function PurchaseCard({ entry }: { entry: PurchaseHistoryEntry }) {
  const groups = groupTicketsByFlight(entry.tickets);
  const issuedTicketCount = entry.tickets.filter((ticket) => ticket.status === "ISSUED").length;

  return (
    <article className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Código de reserva</p>
          <p className="font-mono text-[15px] font-extrabold break-words">{entry.code}</p>
        </div>
        <PurchaseStatus status={entry.status} />
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Total abonado: <b className="text-foreground">{formatCurrency(entry.totalAmount)}</b>
      </p>

      <PurchaseContingencyAlerts entry={entry} />

      <div className="mt-4 grid gap-4">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin pasajes emitidos</p>
        ) : (
          groups.map((group) => (
            <div key={group.flight.id} className="min-w-0">
              <PurchaseSummary
                flight={group.flight}
                ticketCount={group.tickets.filter((ticket) => ticket.status === "ISSUED").length}
                seatClass={group.tickets[0]?.seatClass ?? entry.seatClass}
              />
              <ul className="mt-2 grid gap-1.5">
                {group.tickets.map((ticket) => (
                  <li key={ticket.id} className="min-w-0 text-xs break-words">
                    <b>{`${ticket.lastName}, ${ticket.firstName}`}</b>
                    <span className="text-muted-foreground">
                      {` · ${documentLabel(ticket)} ${ticket.documentNumber}`}
                    </span>
                    <span className="text-muted-foreground">{` · Asiento ${ticket.seat ?? "—"}`}</span>
                    {ticket.status !== "ISSUED" && (
                      <span className="ml-1 font-semibold text-warning">
                        {` · ${TICKET_STATUS_LABELS[ticket.status]}`}
                      </span>
                    )}
                    {ticket.number && (
                      <span className="ml-2 font-mono text-muted-foreground">{ticket.number}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <PurchaseDownloadActions
          code={entry.code}
          ticketCount={issuedTicketCount}
          hasInvoice={entry.invoice !== null}
          canDownload={entry.status === "CONFIRMED"}
        />
      </div>
    </article>
  );
}
