import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { cancellableBookingRow } from "./test-fixtures";
import { cancelBookingVoluntarily } from "./service";

const NOW = new Date("2026-11-14T10:00:00.000Z");
const gateway = { processRefund: vi.fn() };

function flight(id: string, departureAt = "2026-11-20T08:30:00.000Z") {
  return {
    id,
    code: `VU-${id}`,
    date: new Date("2026-11-20T00:00:00.000Z"),
    departureAt: new Date(departureAt),
    status: "SCHEDULED",
    route: { origin: { code: "EZE", city: "Buenos Aires" }, destination: { code: "MDZ", city: "Mendoza" } },
  };
}

function ticket(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    unitPrice: { toString: () => "45000" },
    seat: "1D",
    seatClass: "ECONOMY",
    firstName: "Franco",
    lastName: "Laza",
    contingencies: [],
    flight: flight("VUE_1"),
    ...overrides,
  };
}

beforeEach(() => {
  gateway.processRefund.mockReset();
  gateway.processRefund.mockImplementation(async ({ ticketId }: { ticketId: string }) => ({
    gatewayRefundId: `VOLAR-REE-${ticketId}`,
  }));
  prismaMock.$transaction.mockImplementation(async (callback: unknown) => {
    if (typeof callback === "function") return callback(prismaMock);
    return Promise.all(callback as Promise<unknown>[]);
  });
  prismaMock.booking.updateMany.mockResolvedValue({ count: 1 });
});

const cancel = () => cancelBookingVoluntarily("GNQ47M", "USU_1", "imprevisto", NOW, gateway);

describe("cancelBookingVoluntarily (US-39)", () => {
  it("no encuentra una reserva ajena o inexistente", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(null);

    expect(await cancel()).toEqual({ ok: false, error: "No encontramos la reserva indicada." });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("con una contingencia pendiente deriva a la opción gratuita y no cancela", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      cancellableBookingRow({ tickets: [ticket("PAS_1", { contingencies: [{ id: "CON_1" }] })] }) as never,
    );

    const result = await cancel();

    expect(result).toMatchObject({ ok: false });
    expect(result.ok ? "" : result.error).toContain("sin penalidad");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("cancela la reserva, reembolsa cada pasaje con su retención y libera asientos y cupo", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      cancellableBookingRow({
        tickets: [
          ticket("PAS_1"),
          ticket("PAS_2", { seat: "1E" }),
          // Primera clase en otro vuelo que sale en 30 h: tramo del 35 %.
          ticket("PAS_3", {
            seatClass: "FIRST",
            unitPrice: { toString: () => "90000" },
            flight: flight("VUE_2", "2026-11-15T16:00:00.000Z"),
          }),
        ],
      }) as never,
    );
    prismaMock.ticket.updateMany.mockResolvedValue({ count: 3 });

    const result = await cancel();

    expect(result).toEqual({
      ok: true,
      data: { cancelled: 3, penalty: "49500.00", refund: "130500.00" },
    });
    expect(prismaMock.booking.updateMany).toHaveBeenCalledWith({
      where: { id: "RES_1", buyerId: "USU_1", status: "CONFIRMED" },
      data: { status: "CANCELLED" },
    });
    expect(prismaMock.ticket.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["PAS_1", "PAS_2", "PAS_3"] },
        bookingId: "RES_1",
        status: "ISSUED",
        contingencies: { none: { resolution: "PENDING" } },
        flight: { is: { status: "SCHEDULED", departureAt: { gt: NOW } } },
      },
      data: { status: "REFUNDED", seat: null },
    });
    expect(prismaMock.refund.create.mock.calls.map((call) => call[0].data)).toEqual([
      expect.objectContaining({ ticketId: "PAS_1", amount: "36000.00", penaltyAmount: "9000.00" }),
      expect.objectContaining({ ticketId: "PAS_2", amount: "36000.00", penaltyAmount: "9000.00" }),
      expect.objectContaining({ ticketId: "PAS_3", amount: "58500.00", penaltyAmount: "31500.00" }),
    ]);
    expect(prismaMock.refund.create.mock.calls[0][0].data).toMatchObject({
      reason: "Imprevisto personal o laboral",
      status: "COMPLETED",
      gatewayRefundId: "VOLAR-REE-PAS_1",
      processedAt: NOW,
    });
    expect(gateway.processRefund).toHaveBeenCalledWith({ amount: 36000, ticketId: "PAS_1" });
    expect(prismaMock.flight.update.mock.calls.map((call) => call[0])).toEqual([
      { where: { id: "VUE_1" }, data: { economyOccupied: { decrement: 2 } } },
      { where: { id: "VUE_2" }, data: { firstClassOccupied: { decrement: 1 } } },
    ]);
  });

  it("si la reserva cambió entre la lectura y la escritura, no cancela nada", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(cancellableBookingRow({ tickets: [ticket("PAS_1")] }) as never);
    prismaMock.booking.updateMany.mockResolvedValue({ count: 0 });

    expect(await cancel()).toEqual({
      ok: false,
      error: "La reserva cambió mientras la cancelabas. Volvé a intentarlo.",
    });
    expect(prismaMock.refund.create).not.toHaveBeenCalled();
  });

  it("si un pasaje dejó de ser cancelable al escribir, revierte todo", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      cancellableBookingRow({ tickets: [ticket("PAS_1"), ticket("PAS_2")] }) as never,
    );
    prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });

    expect(await cancel()).toMatchObject({ ok: false });
    expect(prismaMock.refund.create).not.toHaveBeenCalled();
  });
});
