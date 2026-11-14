import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import type {
  PendingPurchaseContingency,
  PurchaseHistory,
  PurchaseHistoryEntry,
  PurchaseHistoryFlight,
  PurchaseHistoryTicket,
} from "@/features/purchase/history";
import { formatCurrency, formatLongDate } from "@/features/flights/format";
import { formatPesos } from "@/features/cancellation/format";
import { PurchaseHistoryView } from "./purchase-history";
import { groupTicketsByFlight } from "./purchase-summary.utils";

const nextFlight: PurchaseHistoryFlight = {
  id: "VUE_PROX",
  code: "VU-20261002-001",
  date: new Date("2026-10-02T00:00:00.000Z"),
  departureAt: new Date("2026-10-02T12:30:00.000Z"),
  arrivalAt: new Date("2026-10-02T14:05:00.000Z"),
  status: "SCHEDULED",
  origin: { code: "AEP", city: "Buenos Aires" },
  destination: { code: "COR", city: "Córdoba" },
  checkinState: "not-open",
};

const pastFlight: PurchaseHistoryFlight = {
  id: "VUE_PAS",
  code: "VU-20260915-001",
  date: new Date("2026-09-15T00:00:00.000Z"),
  departureAt: new Date("2026-09-15T08:00:00.000Z"),
  arrivalAt: new Date("2026-09-15T09:35:00.000Z"),
  status: "COMPLETED",
  origin: { code: "AEP", city: "Buenos Aires" },
  destination: { code: "MDZ", city: "Mendoza" },
  checkinState: "unavailable",
};

const upcomingTicket: PurchaseHistoryTicket = {
  id: "PAS_PROX",
  number: "ETK-00000001",
  seat: "14A",
  seatClass: "ECONOMY",
  status: "ISSUED",
  firstName: "Juan",
  lastName: "Pérez",
  documentType: "DNI",
  documentNumber: "30123456",
  issuedAt: new Date("2026-09-20T10:05:00.000Z"),
  checkedInAt: null,
  flight: nextFlight,
};

const pastTicket: PurchaseHistoryTicket = {
  id: "PAS_PAS",
  number: "ETK-00000002",
  seat: "7C",
  seatClass: "ECONOMY",
  status: "ISSUED",
  firstName: "Ana",
  lastName: "Gómez",
  documentType: "DNI",
  documentNumber: "28987654",
  issuedAt: new Date("2026-09-01T10:05:00.000Z"),
  checkedInAt: null,
  flight: pastFlight,
};

const cancelledTicket: PurchaseHistoryTicket = {
  id: "PAS_CANCEL",
  number: "ETK-00000003",
  seat: "12B",
  seatClass: "ECONOMY",
  status: "CANCELLED",
  firstName: "Juan",
  lastName: "Pérez",
  documentType: "DNI",
  documentNumber: "30123456",
  issuedAt: new Date("2026-09-10T10:05:00.000Z"),
  checkedInAt: null,
  flight: pastFlight,
};

const upcomingEntry: PurchaseHistoryEntry = {
  id: "RES_PROX",
  code: "VOL-ABC123",
  status: "CONFIRMED",
  createdAt: new Date("2026-09-20T10:00:00.000Z"),
  confirmedAt: new Date("2026-09-20T10:05:00.000Z"),
  totalAmount: "135000",
  quantity: 1,
  seatClass: "ECONOMY",
  tickets: [upcomingTicket],
  invoice: { id: "FAC_1", number: 1, issuedAt: new Date("2026-09-20T10:05:00.000Z") },
  pendingContingencies: [],
  voluntaryCancellation: null,
};

const pastEntry: PurchaseHistoryEntry = {
  id: "RES_PAS",
  code: "VOL-PAS456",
  status: "CONFIRMED",
  createdAt: new Date("2026-09-01T10:00:00.000Z"),
  confirmedAt: new Date("2026-09-01T10:05:00.000Z"),
  totalAmount: "98000",
  quantity: 1,
  seatClass: "ECONOMY",
  tickets: [pastTicket],
  invoice: { id: "FAC_2", number: 2, issuedAt: new Date("2026-09-01T10:05:00.000Z") },
  pendingContingencies: [],
  voluntaryCancellation: null,
};

const cancellation: PendingPurchaseContingency = {
  ticketId: cancelledTicket.id,
  accessToken: "tok-secreto-123",
  type: "CANCELLATION",
  previousDepartureAt: new Date("2026-09-15T08:00:00.000Z"),
  previousArrivalAt: new Date("2026-09-15T09:35:00.000Z"),
  newDepartureAt: null,
  newArrivalAt: null,
  reason: "Cancelación operativa",
};

const cancelledEntry: PurchaseHistoryEntry = {
  id: "RES_CANCEL",
  code: "VOL-CAN789",
  status: "CANCELLED",
  createdAt: new Date("2026-09-10T10:00:00.000Z"),
  confirmedAt: new Date("2026-09-10T10:05:00.000Z"),
  totalAmount: "75000",
  quantity: 1,
  seatClass: "ECONOMY",
  tickets: [cancelledTicket],
  invoice: null,
  pendingContingencies: [cancellation],
  voluntaryCancellation: null,
};

function render(history: PurchaseHistory): string {
  return renderToString(<PurchaseHistoryView history={history} />);
}

/** Texto visible: quita las etiquetas para no confundir atributos (href) con contenido. */
function visibleText(html: string): string {
  return html.replace(/<[^>]*>/g, " ");
}

describe("PurchaseHistoryView", () => {
  it("muestra los datos de la compra próxima", () => {
    const html = render({ upcoming: [upcomingEntry], past: [] });

    expect(html).toContain("VOL-ABC123");
    expect(html).toContain("VU-20261002-001");
    expect(html).toContain("AEP");
    expect(html).toContain("COR");
    expect(html).toContain(formatLongDate(nextFlight.date));
    expect(html).toContain("Pérez, Juan");
    expect(html).toContain("Economy");
    expect(html).toContain("14A");
    expect(html).toContain(formatCurrency("135000"));
    expect(html).toContain("DNI 30123456");
  });

  it("marca una compra pasada confirmada como viaje completado", () => {
    const html = render({ upcoming: [], past: [pastEntry] });

    expect(html).toContain("Viaje completado");
    expect(html).not.toContain("Confirmada");
  });

  it("muestra la alerta de cancelación con su link y sin exponer el token", () => {
    const html = render({ upcoming: [], past: [cancelledEntry] });

    expect(html).toContain("Vuelo cancelado");
    expect(html).toContain("Pérez, Juan");
    expect(html).toContain("Gestionar reprogramación o reembolso");
    expect(html).toContain('href="/contingencia/tok-secreto-123"');

    // El token solo puede viajar en el href, nunca como texto ni en atributos accesibles.
    expect(visibleText(html)).not.toContain("tok-secreto-123");
    expect(html).not.toMatch(/title="[^"]*tok-secreto-123/);
    expect(html).not.toMatch(/aria-label="[^"]*tok-secreto-123/);
  });

  it("muestra el estado vacío de próximas con acceso a buscar vuelos", () => {
    const html = render({ upcoming: [], past: [] });

    expect(html).toContain("No tenés vuelos próximos");
    expect(html).toContain('href="/vuelos"');
    expect(html).toContain("Buscar vuelos");
    expect(html).toContain('href="/"');
    expect(html).toContain("Volver al inicio");
  });

  it("muestra el estado vacío del historial", () => {
    const html = render({ upcoming: [], past: [] });

    expect(html).toContain("Todavía no tenés compras pasadas.");
  });

  it("cuenta y ofrece descarga solo de los pasajes ISSUED de la compra", () => {
    const refundedTicket: PurchaseHistoryTicket = {
      ...upcomingTicket,
      id: "PAS_REFUND",
      number: "ETK-00000009",
      firstName: "Ana",
      lastName: "Gómez",
      status: "REFUNDED",
    };
    const entry: PurchaseHistoryEntry = {
      ...upcomingEntry,
      tickets: [upcomingTicket, refundedTicket],
    };

    // React intercala comentarios de texto en SSR.
    const html = render({ upcoming: [entry], past: [] }).replace(/<!--.*?-->/g, "");

    expect(html).toContain("1 pasaje");
    expect(html).toContain("Descargar E-Tickets (1 pasaje PDF)");
    expect(html).not.toContain("2 pasajes PDF");
    // El pasaje reembolsado se informa como tal, pero no suma como emitido.
    expect(html).toContain("Reembolsado");
  });

  it("muestra las descargas como links internos a las rutas autorizadas", () => {
    const html = render({ upcoming: [upcomingEntry], past: [pastEntry] });

    expect(html).toContain('href="/api/compras/VOL-ABC123/etickets"');
    expect(html).toContain('href="/api/compras/VOL-ABC123/factura"');
    expect(html).toContain('href="/api/compras/VOL-PAS456/etickets"');
    expect(html).toContain('href="/api/compras/VOL-PAS456/factura"');
    expect(html).toContain("Descargar E-Tickets (1 pasaje PDF)");
    expect(html).toContain("Descargar Factura Fiscal B (PDF)");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("US-36");
  });

  it("avisa cuando la compra no tiene comprobantes disponibles", () => {
    const html = render({
      upcoming: [{ ...upcomingEntry, tickets: [], invoice: null }],
      past: [],
    });

    expect(html).toContain("Los comprobantes de esta compra no están disponibles.");
    expect(html).not.toContain("/api/compras/VOL-ABC123/etickets");
    expect(html).not.toContain("/api/compras/VOL-ABC123/factura");
  });

  it("oculta las descargas de una compra cancelada y explica el motivo", () => {
    const html = render({ upcoming: [], past: [cancelledEntry] });

    expect(html).toContain(
      "Los comprobantes no están disponibles porque la compra no está confirmada.",
    );
    expect(html).not.toContain("/api/compras/VOL-CAN789");
    expect(html).not.toContain("Descargar E-Tickets");
    expect(html).not.toContain("Descargar Factura Fiscal B (PDF)");
  });

  it("muestra una alerta por cada contingencia pendiente de una compra pasada", () => {
    const scheduleChange: PendingPurchaseContingency = {
      ...cancellation,
      accessToken: "tok-horario-456",
      type: "SCHEDULE_CHANGE",
      newDepartureAt: new Date("2026-09-15T11:00:00.000Z"),
      newArrivalAt: new Date("2026-09-15T12:35:00.000Z"),
      reason: "Reprogramación operativa",
    };

    const html = render({
      upcoming: [],
      past: [{ ...cancelledEntry, pendingContingencies: [cancellation, scheduleChange] }],
    });

    expect(html).toContain("Vuelo cancelado");
    expect(html).toContain("Cambio de horario");
    expect(html).toContain('href="/contingencia/tok-secreto-123"');
    expect(html).toContain('href="/contingencia/tok-horario-456"');
  });
});

describe("groupTicketsByFlight", () => {
  it("agrupa dos pasajes del mismo vuelo", () => {
    const secondTicket: PurchaseHistoryTicket = {
      ...upcomingTicket,
      id: "PAS_PROX_2",
      number: "ETK-00000004",
      seat: "14B",
      firstName: "María",
    };

    const groups = groupTicketsByFlight([upcomingTicket, secondTicket]);

    expect(groups).toHaveLength(1);
    expect(groups[0].flight.id).toBe(nextFlight.id);
    expect(groups[0].tickets.map((ticket) => ticket.id)).toEqual(["PAS_PROX", "PAS_PROX_2"]);
  });

  it("preserva dos vuelos distintos en orden de aparición", () => {
    const secondTicket: PurchaseHistoryTicket = {
      ...upcomingTicket,
      id: "PAS_PROX_2",
      number: "ETK-00000004",
      seat: "14B",
      firstName: "María",
    };
    const otherFlightTicket: PurchaseHistoryTicket = {
      ...upcomingTicket,
      id: "PAS_OTRO",
      flight: pastFlight,
    };

    const groups = groupTicketsByFlight([otherFlightTicket, upcomingTicket, secondTicket]);

    expect(groups.map((group) => group.flight.id)).toEqual([pastFlight.id, nextFlight.id]);
    expect(groups[1].tickets.map((ticket) => ticket.id)).toEqual(["PAS_PROX", "PAS_PROX_2"]);
  });
});

describe("check-in en Mis Compras (US-38)", () => {
  function entryWith(state: PurchaseHistoryFlight["checkinState"], checkedInAt: Date | null = null) {
    const flight = { ...nextFlight, checkinState: state };
    return { ...upcomingEntry, tickets: [{ ...upcomingTicket, flight, checkedInAt }] };
  }
  const renderCard = (entry: PurchaseHistoryEntry) =>
    renderToString(<PurchaseHistoryView history={{ upcoming: [entry], past: [] }} />);
  const CHECKIN_HREF = 'href="/compra/checkin?reserva=VOL-ABC123"';

  it("antes de la ventana avisa desde cuándo se puede hacer", () => {
    const html = renderCard(entryWith("not-open"));

    expect(html).toContain("Check-in online desde el 01/10/2026 a las 12:30 hs");
    expect(html).not.toContain(CHECKIN_HREF);
  });

  it("con la ventana abierta ofrece hacer el check-in", () => {
    const html = renderCard(entryWith("open"));

    expect(html).toContain(CHECKIN_HREF);
    expect(html).toContain("Hacer check-in");
  });

  it("si todos ya hicieron el check-in lleva a las tarjetas de embarque", () => {
    const html = renderCard(entryWith("open", new Date("2026-10-01T20:00:00.000Z")));

    expect(html).toContain(CHECKIN_HREF);
    expect(html).toContain("Ver tarjetas de embarque");
    expect(html).not.toContain("Hacer check-in");
  });

  it("con la ventana cerrada solo ofrece las tarjetas de quien hizo el check-in", () => {
    expect(renderCard(entryWith("closed"))).toContain("El check-in online cerró");
    expect(renderCard(entryWith("closed", new Date("2026-10-01T20:00:00.000Z")))).toContain(
      "Ver tarjetas de embarque",
    );
  });

  it("un vuelo cancelado o ya salido no muestra el check-in", () => {
    const html = renderCard(entryWith("unavailable"));

    expect(html).not.toContain("heck-in");
  });
});

describe("cancelación voluntaria en Mis Compras (US-39)", () => {
  const render = (history: PurchaseHistory) => renderToString(<PurchaseHistoryView history={history} />);
  const CANCEL_HREF = 'href="/compra/cancelar?reserva=VOL-ABC123"';

  it("una compra próxima confirmada ofrece cancelar la reserva", () => {
    const html = render({ upcoming: [upcomingEntry], past: [] });

    expect(html).toContain(CANCEL_HREF);
    expect(html).toContain("Cancelar reserva");
  });

  it("con una contingencia pendiente no ofrece la cancelación con penalidad", () => {
    const html = render({ upcoming: [{ ...upcomingEntry, pendingContingencies: [cancellation] }], past: [] });

    expect(html).not.toContain(CANCEL_HREF);
  });

  it("una reserva cancelada por el pasajero muestra el motivo, el reintegro y la retención", () => {
    const html = render({
      upcoming: [],
      past: [
        {
          ...pastEntry,
          status: "CANCELLED",
          voluntaryCancellation: {
            reason: "Imprevisto personal o laboral",
            refund: "36000.00",
            penalty: "9000.00",
          },
        },
      ],
    });

    expect(html).toContain("Cancelada por el pasajero");
    expect(html).toContain("Imprevisto personal o laboral");
    expect(html).toContain(formatPesos("36000.00"));
    expect(html).toContain(formatPesos("9000.00"));
  });
});
