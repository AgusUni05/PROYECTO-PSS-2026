import type { PurchaseHistoryFlight, PurchaseHistoryTicket } from "@/features/purchase/history";

export type PurchaseFlightGroup = {
  flight: PurchaseHistoryFlight;
  tickets: PurchaseHistoryTicket[];
};

/** Agrupa pasajes por vuelo vigente y conserva el orden de aparición. */
export function groupTicketsByFlight(tickets: PurchaseHistoryTicket[]): PurchaseFlightGroup[] {
  const groups: PurchaseFlightGroup[] = [];
  const positionByFlight = new Map<string, number>();

  for (const ticket of tickets) {
    const position = positionByFlight.get(ticket.flight.id);
    if (position === undefined) {
      positionByFlight.set(ticket.flight.id, groups.length);
      groups.push({ flight: ticket.flight, tickets: [ticket] });
    } else {
      groups[position].tickets.push(ticket);
    }
  }

  return groups;
}
