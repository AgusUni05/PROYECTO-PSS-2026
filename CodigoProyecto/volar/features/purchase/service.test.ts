import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { cardBrand, processPayment } from "./service";
import type { PaymentFormValues } from "./schema";

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "RES_1",
    code: "DEMO0001",
    status: "PENDING_PAYMENT",
    holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    quantity: 3,
    totalAmount: { toString: () => "135000" },
    flightId: "VUE_1",
    seatClass: "ECONOMY",
    contactName: "Pasajero Demo",
    contactEmail: "demo@volar.test",
    flight: { code: "VU-DEMO-01", economyCapacity: 150, firstClassCapacity: 12 },
    tickets: [
      { id: "PAS_1", firstName: "María", lastName: "Demo", unitPrice: { toString: () => "45000" } },
      { id: "PAS_2", firstName: "Juan", lastName: "Demo", unitPrice: { toString: () => "45000" } },
      { id: "PAS_3", firstName: "Ana", lastName: "Demo", unitPrice: { toString: () => "45000" } },
    ],
    ...overrides,
  };
}

const values: PaymentFormValues = {
  medioPago: "CREDIT",
  numeroTarjeta: "4517882099124242", // último dígito par → aprobado
  titular: "Juan Carlos Perez",
  vencimiento: "12/99",
  cvv: "123",
  cuotas: 3,
};

const rejectedValues: PaymentFormValues = {
  ...values,
  numeroTarjeta: "4517882099124243", // último dígito impar → rechazado
};

beforeEach(() => {
  prismaMock.$transaction.mockImplementation(async (callback: unknown) => {
    if (typeof callback === "function") {
      return callback(prismaMock);
    }
    return Promise.all(callback as Promise<unknown>[]);
  });
  // Asientos ya ocupados por pasajes emitidos del vuelo: ninguno (asientos libres).
  prismaMock.ticket.findMany.mockResolvedValue([] as never);
});

describe("cardBrand (US-20)", () => {
  it("identifica la marca por el primer dígito", () => {
    expect(cardBrand("4517882099124242")).toBe("VISA");
    expect(cardBrand("5517882099124242")).toBe("MASTERCARD");
    expect(cardBrand("3417882099124242")).toBe("AMEX");
    expect(cardBrand("9917882099124242")).toBe("OTRA");
  });
});

describe("processPayment (US-20/US-21/US-22)", () => {
  it("aprueba con último dígito par, registra el intento sin datos sensibles y confirma la compra", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(bookingRow() as never);
    prismaMock.booking.updateMany.mockResolvedValue({ count: 1 });

    const result = await processPayment("DEMO0001", values);

    expect(result).toMatchObject({
      ok: true,
      data: { status: "APPROVED", bookingCode: "DEMO0001", rejectionReason: null },
    });

    const payment = prismaMock.payment.create.mock.calls[0][0].data as Record<string, unknown>;
    expect(payment).toMatchObject({
      status: "APPROVED",
      cardBrand: "VISA",
      cardLast4: "4242",
      rejectionReason: null,
    });
    // RNF-08: nunca se persisten datos sensibles de la tarjeta.
    for (const sensitive of ["numeroTarjeta", "titular", "vencimiento", "cvv"]) {
      expect(payment).not.toHaveProperty(sensitive);
    }

    expect(prismaMock.booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "RES_1", status: "PENDING_PAYMENT" }),
        data: expect.objectContaining({ status: "CONFIRMED" }),
      }),
    );
    // La aprobación no toca los contadores (los asientos ya estaban retenidos).
    expect(prismaMock.flight.updateMany).not.toHaveBeenCalled();

    // US-23: un e-ticket por pasajero, con número y asiento, y la factura.
    const issued = prismaMock.ticket.update.mock.calls.map(
      (call) => call[0].data as Record<string, unknown>,
    );
    expect(issued).toHaveLength(3);
    expect(issued[0]).toMatchObject({
      status: "ISSUED",
      number: "ETK-DEMO0001-1",
      seat: "1A",
      issuedAt: expect.any(Date),
    });
    expect(issued.map((data) => data.seat)).toEqual(["1A", "1B", "1C"]);
    expect(issued.map((data) => data.number)).toEqual([
      "ETK-DEMO0001-1",
      "ETK-DEMO0001-2",
      "ETK-DEMO0001-3",
    ]);
    expect(prismaMock.invoice.create).toHaveBeenCalledTimes(1);

    // US-24: envío simulado de los comprobantes al correo del comprador.
    expect(prismaMock.emailNotification.create.mock.calls[0][0].data).toMatchObject({
      type: "PURCHASE_CONFIRMATION",
      recipientEmail: "demo@volar.test",
      status: "SENT",
    });
  });

  it("rechaza con último dígito impar, cancela los pasajes y libera el cupo", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(bookingRow() as never);
    prismaMock.booking.updateMany.mockResolvedValue({ count: 1 });

    const result = await processPayment("DEMO0001", rejectedValues);

    expect(result).toMatchObject({
      ok: true,
      data: { status: "REJECTED", rejectionReason: expect.stringContaining("insuficientes") },
    });
    expect(prismaMock.payment.create.mock.calls[0][0].data).toMatchObject({ status: "REJECTED" });
    expect(prismaMock.ticket.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bookingId: "RES_1", status: "PENDING" },
        data: { status: "CANCELLED" },
      }),
    );
    expect(prismaMock.flight.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "VUE_1", economyOccupied: { gte: 3 } },
        data: { economyOccupied: { decrement: 3 } },
      }),
    );
  });

  it("libera el cupo de Primera cuando la reserva es de esa clase", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      bookingRow({ seatClass: "FIRST" }) as never,
    );
    prismaMock.booking.updateMany.mockResolvedValue({ count: 1 });

    await processPayment("DEMO0001", rejectedValues);

    expect(prismaMock.flight.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "VUE_1", firstClassOccupied: { gte: 3 } },
        data: { firstClassOccupied: { decrement: 3 } },
      }),
    );
  });

  it("rechaza si la reserva no existe", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(null);

    const result = await processPayment("NADA0000", values);

    expect(result.ok).toBe(false);
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it("rechaza si la reserva ya no está pendiente de pago", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(bookingRow({ status: "CONFIRMED" }) as never);

    const result = await processPayment("DEMO0001", values);

    expect(result).toEqual({ ok: false, error: "La reserva ya fue pagada y confirmada." });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rechaza si la retención de cupo venció", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      bookingRow({ holdExpiresAt: new Date(Date.now() - 1000) }) as never,
    );

    const result = await processPayment("DEMO0001", values);

    expect(result.ok).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("avisa si la reserva cambió mientras se procesaba el pago", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(bookingRow() as never);
    prismaMock.booking.updateMany.mockResolvedValue({ count: 0 });

    const result = await processPayment("DEMO0001", values);

    expect(result).toEqual({
      ok: false,
      error: "La reserva cambió mientras se procesaba el pago. Volvé a intentarlo.",
    });
  });

  it("no atribuye a una carrera los fallos de la emisión y deja el error en el log", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(bookingRow() as never);
    prismaMock.booking.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.invoice.create.mockRejectedValue(new Error("boom") as never);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await processPayment("DEMO0001", values);

    expect(result).toEqual({
      ok: false,
      error: "No pudimos completar la compra. Volvé a intentarlo en unos minutos.",
    });
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
