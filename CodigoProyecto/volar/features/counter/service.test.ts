import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { createCounterSale } from "./service";

const seller = { id: "USU_SELLER" };
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

const passenger = {
  nombre: "Esteban",
  apellido: "Ríos",
  tipoDocumento: "DNI" as const,
  numeroDocumento: "29881234",
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  prismaMock.$transaction.mockImplementation(async (callback: unknown) => {
    if (typeof callback === "function") return callback(prismaMock);
    return Promise.all(callback as Promise<unknown>[]);
  });
  prismaMock.ticket.findMany.mockResolvedValue([]);
});

describe("createCounterSale (US-33)", () => {
  it("rechaza si el vuelo no está a la venta", async () => {
    prismaMock.flight.findUnique.mockResolvedValue({ ...flight, status: "CANCELLED" } as never);

    const result = await createCounterSale(
      { flightId: flight.id, seatClass: "ECONOMY", metodoPago: "CASH", contactEmail: "", pasajeros: [passenger] },
      seller,
    );

    expect(result.ok).toBe(false);
  });

  it("rechaza si la cantidad de pasajeros supera el cupo disponible", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(flight as never);

    const result = await createCounterSale(
      {
        flightId: flight.id,
        seatClass: "FIRST",
        metodoPago: "CASH",
        contactEmail: "",
        // Primera: capacidad 16, ocupado 4 -> disponible 12. Se piden 13.
        pasajeros: Array.from({ length: 13 }, () => passenger),
      },
      seller,
    );

    expect(result.ok).toBe(false);
    expect(prismaMock.flight.updateMany).not.toHaveBeenCalled();
  });

  it("registra la venta: retiene cupo, confirma la reserva, emite pasajes y factura", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(flight as never);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.booking.create.mockResolvedValue({} as never);
    prismaMock.ticket.createMany.mockResolvedValue({ count: 1 } as never);
    prismaMock.payment.create.mockResolvedValue({} as never);
    prismaMock.ticket.update.mockResolvedValue({} as never);
    prismaMock.invoice.create.mockResolvedValue({} as never);

    const result = await createCounterSale(
      { flightId: flight.id, seatClass: "ECONOMY", metodoPago: "POS", contactEmail: "", pasajeros: [passenger] },
      seller,
    );

    expect(result.ok).toBe(true);

    expect(prismaMock.flight.updateMany).toHaveBeenCalledWith({
      where: { id: flight.id, economyOccupied: { lte: flight.economyCapacity - 1 } },
      data: { economyOccupied: { increment: 1 } },
    });

    const bookingCall = prismaMock.booking.create.mock.calls[0][0].data as Record<string, unknown>;
    expect(bookingCall.status).toBe("CONFIRMED");
    expect(bookingCall.channel).toBe("COUNTER");
    expect(bookingCall.sellerId).toBe(seller.id);
    expect(bookingCall.buyerId).toBeUndefined();
    expect(bookingCall.contactName).toBe("Ríos, Esteban");

    const paymentCall = prismaMock.payment.create.mock.calls[0][0].data as Record<string, unknown>;
    expect(paymentCall.status).toBe("APPROVED");
    expect(paymentCall.gateway).toBe("Mostrador — POS");

    // issueComprobantes emite el pasaje (ticket.update a ISSUED) y crea la factura.
    expect(prismaMock.ticket.update).toHaveBeenCalled();
    expect(prismaMock.invoice.create).toHaveBeenCalled();
  });

  it("condición de carrera: si el update atómico de cupo no afecta filas, no registra nada", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(flight as never);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 0 });

    const result = await createCounterSale(
      { flightId: flight.id, seatClass: "ECONOMY", metodoPago: "CASH", contactEmail: "", pasajeros: [passenger] },
      seller,
    );

    expect(result.ok).toBe(false);
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });
});
