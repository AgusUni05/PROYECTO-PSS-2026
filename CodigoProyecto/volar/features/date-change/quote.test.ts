import { describe, expect, it } from "vitest";
import type { CancellableTicket } from "@/features/cancellation/quote";
import { buildChangeQuote, type ChangeCandidate } from "./quote";

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
      // Más de 48 h antes: penalidad del 15 %.
      departureAt: new Date("2026-11-20T08:30:00.000Z"),
      status: "SCHEDULED",
      origin: { code: "EZE", city: "Buenos Aires" },
      destination: { code: "MDZ", city: "Mendoza" },
    },
    ...overrides,
  };
}

const candidate = (fare: string): ChangeCandidate => ({
  id: "VUE_NUEVO",
  code: "VU-20261123-002",
  date: new Date("2026-11-23T00:00:00.000Z"),
  departureAt: new Date("2026-11-23T08:30:00.000Z"),
  arrivalAt: new Date("2026-11-23T10:00:00.000Z"),
  fare,
  available: 30,
  capacity: 100,
});

const booking = (tickets: CancellableTicket[], status = "CONFIRMED" as const) => ({
  code: "GNQ47M",
  status,
  tickets,
});

describe("buildChangeQuote (US-39, cambio de fecha)", () => {
  it("reproduce el ejemplo del wireframe: 3 pasajes de $ 45.000 a un vuelo de $ 48.000", () => {
    const quote = buildChangeQuote(
      booking([ticket(), ticket({ id: "PAS_2" }), ticket({ id: "PAS_3" })]),
      candidate("48000"),
      NOW,
    );

    expect(quote).toMatchObject({
      blocked: null,
      penaltyRate: 0.15,
      tierLabel: "Más de 48 horas antes",
      credit: "135000.00",
      newCost: "144000.00",
      fareDifference: "9000.00",
      penalty: "20250.00",
      total: "29250.00",
    });
    expect(quote.lines.map((l) => [l.ticketId, l.newUnitPrice])).toEqual([
      ["PAS_1", "48000.00"],
      ["PAS_2", "48000.00"],
      ["PAS_3", "48000.00"],
    ]);
  });

  it("si el vuelo nuevo es más barato no hay diferencia ni devolución, y el pasaje conserva lo pagado", () => {
    const quote = buildChangeQuote(booking([ticket()]), candidate("39000"), NOW);

    expect(quote).toMatchObject({ fareDifference: "0.00", penalty: "6750.00", total: "6750.00" });
    expect(quote.lines[0].newUnitPrice).toBe("45000.00");
  });

  it("la penalidad depende de la anticipación respecto del vuelo actual", () => {
    const soon = ticket({
      flight: { ...ticket().flight, departureAt: new Date("2026-11-15T16:00:00.000Z") },
    });

    expect(buildChangeQuote(booking([soon]), candidate("45000"), NOW)).toMatchObject({
      penaltyRate: 0.25,
      penalty: "11250.00",
      total: "11250.00",
    });
  });

  it("aplica los mismos bloqueos que la cancelación", () => {
    expect(buildChangeQuote(booking([ticket({ hasPendingContingency: true })]), candidate("45000"), NOW).blocked).toBe(
      "contingency",
    );
    expect(buildChangeQuote(booking([]), candidate("45000"), NOW).blocked).toBe("no-tickets");
    expect(buildChangeQuote(booking([ticket()], "CANCELLED" as never), candidate("45000"), NOW).blocked).toBe(
      "not-confirmed",
    );
  });
});
