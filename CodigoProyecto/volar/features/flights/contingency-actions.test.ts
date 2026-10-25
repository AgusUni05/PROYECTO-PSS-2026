import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("./contingency-resolution", () => ({
  resolveRefund: vi.fn(),
  resolveRebooking: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  canPassengerAccessBooking: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { resolveRebooking, resolveRefund } from "./contingency-resolution";
import { canPassengerAccessBooking } from "@/lib/auth";
import { resolveRebookingAction, resolveRefundAction } from "./contingency-actions";

const mockedResolveRefund = vi.mocked(resolveRefund);
const mockedResolveRebooking = vi.mocked(resolveRebooking);

const mockBooking = { buyerId: "BUY_1", contactEmail: "buyer@example.com" };
const mockContingency = {
  id: "TC_1",
  ticket: { id: "PAS_1", booking: mockBooking },
};

describe("resolveRefundAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.ticketContingency.findUnique.mockResolvedValue(mockContingency as never);
    vi.mocked(canPassengerAccessBooking).mockResolvedValue(true);
  });

  it("rechaza un token vacío", async () => {
    const result = await resolveRefundAction("");

    expect(result).toEqual({ ok: false, error: "El enlace no es válido." });
    expect(mockedResolveRefund).not.toHaveBeenCalled();
  });

  it("rechaza un token que no existe", async () => {
    prismaMock.ticketContingency.findUnique.mockResolvedValue(null);

    const result = await resolveRefundAction("tok-abc-123");

    expect(result).toEqual({ ok: false, error: "El enlace no es válido o expiró." });
    expect(mockedResolveRefund).not.toHaveBeenCalled();
  });

  it("rechaza cuando el usuario no tiene acceso a la reserva", async () => {
    vi.mocked(canPassengerAccessBooking).mockResolvedValue(false);

    const result = await resolveRefundAction("tok-abc-123");

    expect(result).toEqual({ ok: false, error: "Necesitás iniciar sesión para continuar." });
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

    expect(canPassengerAccessBooking).toHaveBeenCalledWith(mockBooking);
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

describe("resolveRebookingAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.ticketContingency.findUnique.mockResolvedValue(mockContingency as never);
    vi.mocked(canPassengerAccessBooking).mockResolvedValue(true);
  });

  it("rechaza un token vacío sin llamar al dominio", async () => {
    const result = await resolveRebookingAction("", "VUE_2");

    expect(result).toEqual({ ok: false, error: "El enlace no es válido." });
    expect(mockedResolveRebooking).not.toHaveBeenCalled();
  });

  it("exige un vuelo alternativo seleccionado", async () => {
    const result = await resolveRebookingAction("tok-abc-123", "");

    expect(result).toEqual({ ok: false, error: "Elegí un vuelo alternativo." });
    expect(mockedResolveRebooking).not.toHaveBeenCalled();
  });

  it("rechaza cuando el usuario no tiene acceso a la reserva", async () => {
    vi.mocked(canPassengerAccessBooking).mockResolvedValue(false);

    const result = await resolveRebookingAction("tok-abc-123", "VUE_2");

    expect(result).toEqual({ ok: false, error: "Necesitás iniciar sesión para continuar." });
    expect(mockedResolveRebooking).not.toHaveBeenCalled();
  });

  it("devuelve el nuevo comprobante y revalida la página", async () => {
    mockedResolveRebooking.mockResolvedValue({
      type: "ok",
      ticketId: "PAS_1",
      newFlightId: "VUE_2",
      flightCode: "VU-20300104-001",
      seat: "1B",
      ticketNumber: "ETK-RES1A2B3-1-R1",
      resolvedAt: new Date("2026-09-26T12:00:00.000Z"),
    });

    const result = await resolveRebookingAction("tok-abc-123", "VUE_2");

    expect(mockedResolveRebooking).toHaveBeenCalledWith("tok-abc-123", "VUE_2", {});
    expect(result).toEqual({
      ok: true,
      data: { ticketNumber: "ETK-RES1A2B3-1-R1", flightCode: "VU-20300104-001", seat: "1B" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/contingencia/tok-abc-123");
  });

  it("rechaza una contingencia ya resuelta y revalida la página", async () => {
    mockedResolveRebooking.mockResolvedValue({
      type: "alreadyResolved",
      resolution: "REBOOK",
      resolvedAt: new Date("2026-09-26T15:00:00.000Z"),
    });

    const result = await resolveRebookingAction("tok-abc-123", "VUE_2");

    expect(result).toEqual({ ok: false, error: "Esta contingencia ya fue resuelta." });
    expect(revalidatePath).toHaveBeenCalledWith("/contingencia/tok-abc-123");
  });

  it("informa un token inexistente", async () => {
    prismaMock.ticketContingency.findUnique.mockResolvedValue(null);

    const result = await resolveRebookingAction("tok-abc-123", "VUE_2");

    expect(result).toEqual({ ok: false, error: "El enlace no es válido o expiró." });
  });

  it("traduce un vuelo no elegible o sin cupo a un mensaje para el pasajero sin exponer el motivo interno", async () => {
    mockedResolveRebooking.mockResolvedValue({ type: "conflict", reason: "NO_CAPACITY" });

    const result = await resolveRebookingAction("tok-abc-123", "VUE_2");

    expect(result).toEqual({
      ok: false,
      error: "El vuelo elegido ya no está disponible. Elegí otra alternativa.",
    });
    expect(JSON.stringify(result)).not.toContain("NO_CAPACITY");
  });

  it("informa que el pasaje ya no está activo cuando otro token lo resolvió", async () => {
    mockedResolveRebooking.mockResolvedValue({ type: "conflict", reason: "TICKET_NOT_ACTIVE" });

    const result = await resolveRebookingAction("tok-abc-123", "VUE_2");

    expect(result).toEqual({
      ok: false,
      error: "Este pasaje ya no está activo. Revisá el estado de tu compra.",
    });
    expect(JSON.stringify(result)).not.toContain("TICKET_NOT_ACTIVE");
  });

  it("devuelve error genérico ante una excepción inesperada sin exponer detalles internos", async () => {
    mockedResolveRebooking.mockRejectedValue(new Error("DB connection lost"));

    const result = await resolveRebookingAction("tok-abc-123", "VUE_2");

    expect(result).toEqual({ ok: false, error: "No se pudo procesar la reprogramación." });
    expect(JSON.stringify(result)).not.toContain("DB connection lost");
  });
});
