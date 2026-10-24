import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("./contingency-resolution", () => ({
  resolveRefund: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { resolveRefund } from "./contingency-resolution";
import { resolveRefundAction } from "./contingency-actions";

const mockedResolveRefund = vi.mocked(resolveRefund);

describe("resolveRefundAction", () => {
  it("rechaza un token vacío", async () => {
    const result = await resolveRefundAction("");

    expect(result).toEqual({ ok: false, error: "El enlace no es válido." });
    expect(mockedResolveRefund).not.toHaveBeenCalled();
  });

  it("devuelve los datos del reembolso y revalida la página", async () => {
    mockedResolveRefund.mockResolvedValue({
      type: "ok",
      refundId: "REE_1",
      amount: 45000,
      gatewayRefundId: "GW-123",
      ticketId: "PAS_1",
      resolvedAt: new Date("2026-09-26T14:00:00.000Z"),
    });

    const result = await resolveRefundAction("tok-abc-123");

    expect(result).toEqual({
      ok: true,
      data: { refundId: "REE_1", amount: 45000, gatewayRefundId: "GW-123" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/contingencia/tok-abc-123");
  });

  it("rechaza una contingencia ya resuelta como reembolso y revalida la página", async () => {
    mockedResolveRefund.mockResolvedValue({
      type: "alreadyResolved",
      resolution: "REFUND",
      resolvedAt: new Date("2026-09-26T14:00:00.000Z"),
    });

    const result = await resolveRefundAction("tok-abc-123");

    expect(result).toEqual({ ok: false, error: "Esta contingencia ya fue resuelta." });
    expect(revalidatePath).toHaveBeenCalledWith("/contingencia/tok-abc-123");
  });

  it("devuelve error genérico ante una excepción inesperada sin exponer detalles internos", async () => {
    mockedResolveRefund.mockRejectedValue(new Error("DB connection lost"));

    const result = await resolveRefundAction("tok-abc-123");

    expect(result).toEqual({ ok: false, error: "No se pudo procesar el reembolso." });
  });
});
