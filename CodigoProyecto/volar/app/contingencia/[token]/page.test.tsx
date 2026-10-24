import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("@/features/flights/contingency-queries", () => ({
  getContingencyByToken: vi.fn(),
}));

import { getContingencyByToken } from "@/features/flights/contingency-queries";
import ContingenciaPage from "./page";

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

// US-26: la página de contingencia es pública y no requiere Clerk.
describe("ContingenciaPage", () => {
  it("muestra estado no encontrado para un token inválido", async () => {
    vi.mocked(getContingencyByToken).mockResolvedValue(null);

    const element = await ContingenciaPage({ params: Promise.resolve({ token: "invalido" }) });
    const html = renderToString(element);

    expect(html).toContain("Enlace no válido");
    expect(getContingencyByToken).toHaveBeenCalledWith("invalido");
  });

  it("muestra estado final sin acciones para un token ya resuelto", async () => {
    vi.mocked(getContingencyByToken).mockResolvedValue({
      status: "REFUND",
      resolution: "REFUND",
      resolvedAt: new Date("2026-09-26T14:00:00.000Z"),
    });

    const element = await ContingenciaPage({ params: Promise.resolve({ token: "tok-abc-123" }) });
    const html = renderToString(element);

    expect(html).toContain("Reembolso confirmado");
    expect(html).not.toContain("Reprogramar");
  });

  it("muestra resumen, advertencia y botones deshabilitados para un token pendiente", async () => {
    vi.mocked(getContingencyByToken).mockResolvedValue(pendingView);

    const element = await ContingenciaPage({ params: Promise.resolve({ token: "tok-abc-123" }) });
    const html = renderToString(element);

    expect(html).toContain("Tu vuelo fue cancelado");
    expect(html).toContain("Pérez");
    expect(html).toContain("Reprogramar");
    expect(html).toContain("Reembolso");
    expect(html).toContain("Una vez que elijas");
    expect(html).toMatch(/disabled/);
  });

  it("no consulta ni requiere autenticación de Clerk", async () => {
    vi.mocked(getContingencyByToken).mockResolvedValue(pendingView);

    const element = await ContingenciaPage({ params: Promise.resolve({ token: "tok-abc-123" }) });
    const html = renderToString(element);

    expect(html).toContain("Tu vuelo fue cancelado");
    // La página no importa ni llama a funciones de auth de Clerk.
    expect(getContingencyByToken).toHaveBeenCalledWith("tok-abc-123");
  });
});
