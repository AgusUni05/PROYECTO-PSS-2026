import { describe, expect, it } from "vitest";
import { buildCancellationQuote, type CancellableTicket } from "./quote";

const NOW = new Date("2026-11-14T10:00:00.000Z");

function ticket(overrides: Partial<CancellableTicket> = {}): CancellableTicket {
  return {
    id: "PAS_1",
    unitPrice: "45000",
    seat: "1D",
    seatClass: "ECONOMY",
    firstName: "Franco",
    lastName: "Laza",
    hasPendingContingency: false,
    flight: {
      id: "VUE_1",
      code: "VU-20261120-002",
      date: new Date("2026-11-20T00:00:00.000Z"),
      // 6 días antes: tramo de más de 48 h (20 %).
      departureAt: new Date("2026-11-20T08:30:00.000Z"),
      status: "SCHEDULED",
      origin: { code: "EZE", city: "Buenos Aires" },
      destination: { code: "MDZ", city: "Mendoza" },
    },
    ...overrides,
  };
}

const quote = (tickets: CancellableTicket[], status = "CONFIRMED" as const) =>
  buildCancellationQuote({ code: "GNQ47M", status, tickets, paymentMethod: "VISA •••• 1112" }, NOW);

describe("buildCancellationQuote (US-39)", () => {
  it("liquida cada pasaje según el tramo de su vuelo y suma los totales", () => {
    const result = quote([
      ticket(),
      ticket({
        id: "PAS_2",
        firstName: "Ana",
        // Sale en 30 h: tramo de 24 a 48 h (35 %).
        flight: { ...ticket().flight, id: "VUE_2", departureAt: new Date("2026-11-15T16:00:00.000Z") },
      }),
    ]);

    expect(result.blocked).toBeNull();
    expect(result.lines.map((l) => [l.ticketId, l.retentionRate, l.paid, l.penalty, l.refund])).toEqual([
      ["PAS_1", 0.2, "45000.00", "9000.00", "36000.00"],
      ["PAS_2", 0.35, "45000.00", "15750.00", "29250.00"],
    ]);
    expect(result.totals).toEqual({ paid: "90000.00", penalty: "24750.00", refund: "65250.00" });
    expect(result.paymentMethod).toBe("VISA •••• 1112");
  });

  it("una reserva no confirmada no se puede cancelar", () => {
    expect(quote([ticket()], "CANCELLED" as never).blocked).toBe("not-confirmed");
  });

  it("una reserva sin pasajes activos no se puede cancelar", () => {
    expect(quote([]).blocked).toBe("no-tickets");
  });

  it("con una contingencia pendiente se usa la opción gratuita de la aerolínea", () => {
    expect(quote([ticket({ hasPendingContingency: true })]).blocked).toBe("contingency");
  });

  it("si algún vuelo ya salió o no está programado no se puede cancelar", () => {
    expect(
      quote([ticket({ flight: { ...ticket().flight, departureAt: new Date("2026-11-14T09:00:00.000Z") } })])
        .blocked,
    ).toBe("departed");
    expect(quote([ticket({ flight: { ...ticket().flight, status: "CANCELLED" } })]).blocked).toBe(
      "departed",
    );
  });
});
