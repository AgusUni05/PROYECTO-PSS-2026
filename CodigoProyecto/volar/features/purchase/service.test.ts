import { describe, expect, it, beforeEach, vi } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import {
  createBooking,
  expireBookingIfDue,
  getBookingHold,
  releaseExpiredHoldsForFlight,
} from "./service";
import { cardBrand, processPayment } from "./service";
import type { PaymentFormValues } from "./schema";

const buyer = { id: "USU_1", email: "pasajero@test.com", firstName: "Juan", lastName: "Pérez" };

const now = new Date("2026-10-01T12:00:00.000Z");

const flight = {
  id: "VUE_1",
  code: "VU-20261002-01",
  status: "SCHEDULED" as const,
  date: new Date("2026-10-02T00:00:00.000Z"),
  departureAt: new Date("2026-10-02T08:30:00.000Z"),
  arrivalAt: new Date("2026-10-02T10:00:00.000Z"),
  economyCapacity: 150,
  economyOccupied: 8,
  firstClassCapacity: 16,
  firstClassOccupied: 4,
  economyFare: 45000,
  firstClassFare: 95000,
  salesPeriod: {
    startDate: new Date("2026-10-01T00:00:00.000Z"),
    endDate: new Date("2026-10-31T00:00:00.000Z"),
  },
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  prismaMock.$transaction.mockImplementation(async (callback: unknown) => {
    if (typeof callback === "function") return callback(prismaMock);
    return Promise.all(callback as Promise<unknown>[]);
  });
  prismaMock.booking.findMany.mockResolvedValue([]);
});

describe("createBooking (US-15/US-17)", () => {
  it("rechaza si el vuelo no existe", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(null);

    const result = await createBooking({ flightId: "VUE_x", seatClass: "ECONOMY", quantity: 1 }, buyer);

    expect(result.ok).toBe(false);
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });

  it("rechaza si el vuelo ya no está a la venta", async () => {
    prismaMock.flight.findUnique.mockResolvedValue({ ...flight, status: "CANCELLED" } as never);

    const result = await createBooking({ flightId: flight.id, seatClass: "ECONOMY", quantity: 1 }, buyer);

    expect(result.ok).toBe(false);
  });

  it("rechaza si la cantidad supera el cupo disponible de la clase", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(flight as never);

    // Economy: capacidad 150, ocupado 8 -> disponible 142. Pide de más en Primera (16-4=12 libres).
    const result = await createBooking({ flightId: flight.id, seatClass: "FIRST", quantity: 13 }, buyer);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.cantidad).toBeDefined();
    expect(prismaMock.flight.updateMany).not.toHaveBeenCalled();
  });

  it("reserva: retiene el cupo de forma atómica y crea la reserva con hold de 10 minutos", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(flight as never);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.booking.create.mockResolvedValue({} as never);

    const result = await createBooking({ flightId: flight.id, seatClass: "ECONOMY", quantity: 3 }, buyer);

    expect(result.ok).toBe(true);
    expect(prismaMock.flight.updateMany).toHaveBeenCalledWith({
      where: { id: flight.id, economyOccupied: { lte: flight.economyCapacity - 3 } },
      data: { economyOccupied: { increment: 3 } },
    });

    const createCall = prismaMock.booking.create.mock.calls[0][0].data as Record<string, unknown>;
    expect(createCall.status).toBe("PENDING_PAYMENT");
    expect(createCall.quantity).toBe(3);
    expect(createCall.seatClass).toBe("ECONOMY");
    expect(createCall.buyerId).toBe(buyer.id);
    expect(createCall.contactEmail).toBe(buyer.email);
    expect(String(createCall.totalAmount)).toBe("135000");
    expect((createCall.holdExpiresAt as Date).getTime() - now.getTime()).toBe(10 * 60_000);
  });

  it("condición de carrera: si el update atómico no afecta filas, no crea la reserva", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(flight as never);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 0 });

    const result = await createBooking({ flightId: flight.id, seatClass: "ECONOMY", quantity: 3 }, buyer);

    expect(result.ok).toBe(false);
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });
});

describe("releaseExpiredHoldsForFlight (US-15)", () => {
  it("no hace nada si no hay retenciones vencidas", async () => {
    prismaMock.booking.findMany.mockResolvedValue([]);

    await releaseExpiredHoldsForFlight(flight.id, now);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("vence las retenciones pasadas y libera el cupo ocupado", async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      { id: "RES_1", flightId: flight.id, seatClass: "ECONOMY", quantity: 2 },
    ] as never);
    prismaMock.booking.updateMany.mockResolvedValue({ count: 1 });

    await releaseExpiredHoldsForFlight(flight.id, now);

    expect(prismaMock.booking.updateMany).toHaveBeenCalledWith({
      where: { id: "RES_1", status: "PENDING_PAYMENT" },
      data: { status: "EXPIRED" },
    });
    expect(prismaMock.flight.update).toHaveBeenCalledWith({
      where: { id: flight.id },
      data: { economyOccupied: { decrement: 2 } },
    });
  });

  it("no libera cupo si otra request ya resolvió esa reserva", async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      { id: "RES_1", flightId: flight.id, seatClass: "FIRST", quantity: 1 },
    ] as never);
    prismaMock.booking.updateMany.mockResolvedValue({ count: 0 });

    await releaseExpiredHoldsForFlight(flight.id, now);

    expect(prismaMock.flight.update).not.toHaveBeenCalled();
  });
});

describe("expireBookingIfDue (US-15)", () => {
  it("false si la reserva no existe", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(null);

    expect(await expireBookingIfDue("RES_x", now)).toBe(false);
  });

  it("true si ya estaba vencida, sin tocar la transacción", async () => {
    prismaMock.booking.findUnique.mockResolvedValue({ status: "EXPIRED" } as never);

    expect(await expireBookingIfDue("RES_1", now)).toBe(true);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("false si el estado no es pendiente ni vencido (ya pagada)", async () => {
    prismaMock.booking.findUnique.mockResolvedValue({ status: "CONFIRMED" } as never);

    expect(await expireBookingIfDue("RES_1", now)).toBe(false);
  });

  it("false si el hold todavía no venció", async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      status: "PENDING_PAYMENT",
      holdExpiresAt: new Date(now.getTime() + 60_000),
    } as never);

    expect(await expireBookingIfDue("RES_1", now)).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("true y libera el cupo si el hold ya venció", async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: "RES_1",
      flightId: flight.id,
      seatClass: "ECONOMY",
      quantity: 2,
      status: "PENDING_PAYMENT",
      holdExpiresAt: new Date(now.getTime() - 1000),
    } as never);
    prismaMock.booking.updateMany.mockResolvedValue({ count: 1 });

    expect(await expireBookingIfDue("RES_1", now)).toBe(true);
    expect(prismaMock.flight.update).toHaveBeenCalledWith({
      where: { id: flight.id },
      data: { economyOccupied: { decrement: 2 } },
    });
  });
});

describe("getBookingHold (US-15)", () => {
  it("null si la reserva no existe", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(null);

    expect(await getBookingHold("RES_1", buyer.id)).toBeNull();
  });

  it("null si la reserva no pertenece al comprador", async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: "RES_1",
      buyerId: "USU_otro",
      status: "PENDING_PAYMENT",
      holdExpiresAt: new Date(now.getTime() + 60_000),
    } as never);

    expect(await getBookingHold("RES_1", buyer.id)).toBeNull();
  });

  it("devuelve el resumen de la reserva vigente", async () => {
    prismaMock.booking.findUnique.mockResolvedValue({
      id: "RES_1",
      code: "ABC123",
      buyerId: buyer.id,
      status: "PENDING_PAYMENT",
      seatClass: "ECONOMY",
      quantity: 2,
      unitPrice: { toString: () => "45000" },
      totalAmount: { toString: () => "90000" },
      holdExpiresAt: new Date(now.getTime() + 60_000),
      flight: {
        code: flight.code,
        date: flight.date,
        departureAt: flight.departureAt,
        arrivalAt: flight.arrivalAt,
        route: {
          origin: { id: "AER_1", code: "EZE", city: "Buenos Aires" },
          destination: { id: "AER_2", code: "COR", city: "Córdoba" },
        },
      },
    } as never);

    const hold = await getBookingHold("RES_1", buyer.id);

    expect(hold?.code).toBe("ABC123");
    expect(hold?.quantity).toBe(2);
    expect(hold?.totalAmount).toBe("90000");
    expect(hold?.flight.origin.code).toBe("EZE");
  });
});

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "RES_1",
    status: "PENDING_PAYMENT",
    holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    quantity: 3,
    totalAmount: { toString: () => "135000" },
    flightId: "VUE_1",
    seatClass: "ECONOMY",
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

    expect(result.ok).toBe(false);
  });
});
