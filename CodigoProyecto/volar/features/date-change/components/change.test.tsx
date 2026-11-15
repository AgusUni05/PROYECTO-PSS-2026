import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("../actions", () => ({ changeBookingAction: vi.fn() }));

import { formatPesos } from "@/features/cancellation/format";
import type { ChangeCandidate, ChangeQuote } from "../quote";
import { ChangeBreakdown } from "./change-breakdown";
import { ChangeFlightList } from "./change-flight-list";
import { ChangePaymentForm } from "./change-payment-form";

const candidates: ChangeCandidate[] = [
  {
    id: "VUE_A",
    code: "VU-20261118-002",
    date: new Date("2026-11-18T00:00:00.000Z"),
    departureAt: new Date("2026-11-18T08:30:00.000Z"),
    arrivalAt: new Date("2026-11-18T10:00:00.000Z"),
    fare: "39000",
    available: 120,
    capacity: 121,
  },
  {
    id: "VUE_B",
    code: "VU-20261119-002",
    date: new Date("2026-11-19T00:00:00.000Z"),
    departureAt: new Date("2026-11-19T08:30:00.000Z"),
    arrivalAt: new Date("2026-11-19T10:00:00.000Z"),
    fare: "45000",
    available: 104,
    capacity: 105,
  },
];

const quote: ChangeQuote = {
  code: "GNQ47M",
  blocked: null,
  tierLabel: "Más de 48 horas antes",
  penaltyRate: 0.15,
  credit: "45000.00",
  newCost: "48000.00",
  fareDifference: "3000.00",
  penalty: "6750.00",
  total: "9750.00",
  lines: [],
};

describe("ChangeFlightList (US-39)", () => {
  const html = renderToString(<ChangeFlightList code="GNQ47M" candidates={candidates} selectedId="VUE_B" />);

  it("cada vuelo selecciona el cambio por link que lleva al desglose, con fecha, hora, tarifa y cupos", () => {
    expect(html).toContain('href="/compra/cambiar?reserva=GNQ47M&amp;vuelo=VUE_A#desglose"');
    expect(html).toContain("VU-20261118-002");
    expect(html).toContain("08:30");
    expect(html).toContain("120 cupos");
    expect(html).toContain("Se muestran hasta 10 vuelos próximos");
  });

  it("marca el vuelo elegido", () => {
    expect(html).toMatch(/aria-current="true"[^>]*href="\/compra\/cambiar\?reserva=GNQ47M&amp;vuelo=VUE_B#desglose"|href="\/compra\/cambiar\?reserva=GNQ47M&amp;vuelo=VUE_B#desglose"[^>]*aria-current="true"/);
  });
});

describe("ChangeBreakdown (US-39)", () => {
  const html = renderToString(<ChangeBreakdown quote={quote} />);

  it("muestra el crédito, el costo nuevo, la diferencia, la penalidad y el adicional", () => {
    expect(html).toContain("Crédito por pasajes originales");
    expect(html).toContain(formatPesos("45000.00"));
    expect(html).toContain(formatPesos("48000.00"));
    expect(html).toContain(formatPesos("3000.00"));
    expect(html).toContain("Penalidad por cambio (15\u00a0%)");
    expect(html).toContain(formatPesos("6750.00"));
    expect(html).toContain("Adicional a abonar");
    expect(html).toContain(formatPesos("9750.00"));
  });
});

describe("ChangePaymentForm (US-39)", () => {
  const html = renderToString(<ChangePaymentForm code="GNQ47M" flightId="VUE_B" quote={quote} />);

  it("pide los datos de la tarjeta", () => {
    for (const id of ["numeroTarjeta", "titular", "vencimiento", "cvv"]) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it("exige aceptar la política y arranca con el pago deshabilitado", () => {
    expect(html).toContain("Acepto los términos de la política de penalidades");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[^<]*Pagar/);
    expect(html).toContain(formatPesos("9750.00"));
  });
});
