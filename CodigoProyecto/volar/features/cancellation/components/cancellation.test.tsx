import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("../actions", () => ({ cancelBookingAction: vi.fn() }));

import { formatPesos } from "../format";
import type { CancellationQuote } from "../quote";
import { CancellationForm } from "./cancellation-form";
import { CancellationSummary } from "./cancellation-summary";

const quote: CancellationQuote = {
  code: "GNQ47M",
  blocked: null,
  paymentMethod: "VISA •••• 1112",
  totals: { paid: "45000.00", penalty: "9000.00", refund: "36000.00" },
  lines: [
    {
      ticketId: "PAS_1",
      passenger: "Laza, Franco",
      seat: "1D",
      seatClass: "ECONOMY",
      flight: {
        id: "VUE_1",
        code: "VU-20261120-002",
        date: new Date("2026-11-20T00:00:00.000Z"),
        departureAt: new Date("2026-11-20T08:30:00.000Z"),
        status: "SCHEDULED",
        origin: { code: "EZE", city: "Buenos Aires" },
        destination: { code: "MDZ", city: "Mendoza" },
      },
      tierLabel: "Más de 48 horas antes",
      retentionRate: 0.2,
      paid: "45000.00",
      penalty: "9000.00",
      refund: "36000.00",
    },
  ],
};

describe("formatPesos (US-39)", () => {
  it("muestra pesos con centavos", () => {
    expect(formatPesos("36000.00")).toBe(formatPesos("36000"));
    expect(formatPesos("21666.66")).toContain("21.666,66");
  });
});

describe("CancellationSummary (US-39)", () => {
  const html = renderToString(<CancellationSummary quote={quote} />);

  it("detalla cada pasaje con su tramo, retención y reintegro", () => {
    expect(html).toContain("Laza, Franco");
    expect(html).toContain("VU-20261120-002");
    expect(html).toContain("Más de 48 horas antes");
    expect(html).toContain("Retención 20 %");
  });

  it("muestra la liquidación con el medio de acreditación y el neto a reembolsar", () => {
    expect(html).toContain(formatPesos("45000.00"));
    expect(html).toContain(formatPesos("9000.00"));
    expect(html).toContain(formatPesos("36000.00"));
    expect(html).toContain("VISA •••• 1112");
    expect(html).toContain("Monto neto a reembolsar");
  });

  it("explica la política de penalidades completa", () => {
    expect(html).toContain("20 %");
    expect(html).toContain("35 %");
    expect(html).toContain("50 %");
  });
});

describe("CancellationForm (US-39)", () => {
  const html = renderToString(<CancellationForm quote={quote} />);

  it("pide el motivo con las opciones del wireframe", () => {
    expect(html).toContain("Imprevisto personal o laboral");
    expect(html).toContain("Cambio de fechas de vacaciones o estadía");
    expect(html).toContain("Razones médicas del grupo familiar");
  });

  it("pide confirmar que es irreversible y arranca con el botón deshabilitado", () => {
    expect(html).toContain("la cancelación voluntaria es irreversible");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[^<]*Solicitar cancelación/);
  });
});
