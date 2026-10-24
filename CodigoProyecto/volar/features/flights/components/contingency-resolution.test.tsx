import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

import {
  ContingencyNotFound,
  ContingencyResolution,
} from "./contingency-resolution";

const pendingView = {
  status: "PENDING" as const,
  token: "tok-abc-123",
  changeType: "CANCELLATION" as const,
  passenger: {
    firstName: "Juan",
    lastName: "Pérez",
    documentNumber: "30123456",
  },
  ticket: {
    id: "PAS_1",
    unitPrice: 45000,
    seatClass: "ECONOMY" as const,
  },
  flight: {
    code: "VU-20261001-001",
    date: new Date("2026-10-01T00:00:00.000Z"),
    origin: { code: "EZE", city: "Buenos Aires" },
    destination: { code: "MDZ", city: "Mendoza" },
    departureAt: new Date("2026-10-01T08:30:00.000Z"),
    arrivalAt: new Date("2026-10-01T10:00:00.000Z"),
  },
  previousDepartureAt: new Date("2026-10-01T08:30:00.000Z"),
  previousArrivalAt: new Date("2026-10-01T10:00:00.000Z"),
  newDepartureAt: null,
  newArrivalAt: null,
};

describe("ContingencyNotFound", () => {
  it("muestra mensaje de enlace no válido", () => {
    const html = renderToString(<ContingencyNotFound />);
    expect(html).toContain("Enlace no válido");
    expect(html).toContain("incompleto");
  });
});

describe("ContingencyResolution", () => {
  it("muestra estado final sin acciones para un token resuelto como reembolso", () => {
    const html = renderToString(
      <ContingencyResolution view={{ status: "REFUND", resolution: "REFUND", resolvedAt: new Date("2026-09-26T14:00:00.000Z") }} />,
    );
    expect(html).toContain("Reembolso confirmado");
    expect(html).not.toContain("Reprogramar");
    expect(html).not.toContain("Solicitar reembolso");
  });

  it("muestra estado final sin acciones para un token resuelto como reprogramación", () => {
    const html = renderToString(
      <ContingencyResolution view={{ status: "REBOOK", resolution: "REBOOK", resolvedAt: new Date("2026-09-26T15:00:00.000Z") }} />,
    );
    expect(html).toContain("Reprogramación confirmada");
    expect(html).not.toContain("Reprogramar");
    expect(html).not.toContain("Solicitar reembolso");
  });

  it("muestra resumen, advertencia de irrevocabilidad, reprogramación deshabilitada y reembolso habilitado para un token pendiente", () => {
    const html = renderToString(<ContingencyResolution view={pendingView} />);

    expect(html).toContain("Tu vuelo fue cancelado");
    // React server render injects comment nodes around whitespace; assert parts instead of the full string.
    expect(html).toContain("Pérez");
    expect(html).toContain("Juan");
    expect(html).toContain("DNI");
    expect(html).toContain("30123456");
    expect(html).toContain("VU-20261001-001");
    expect(html).toContain("Buenos Aires");
    expect(html).toContain("Mendoza");
    expect(html).toContain("Economy");
    expect(html).toMatch(/\$\s*45\.000/);

    expect(html).toContain("Reprogramar");
    expect(html).toContain("Reembolso");
    expect(html).toContain("Solicitar reembolso");
    expect(html).toContain("Una vez que elijas");

    // Reprogramar sigue siendo placeholder (Task 8); reembolso ya está habilitado (Task 7).
    expect(html).toMatch(/disabled/);
  });
});
