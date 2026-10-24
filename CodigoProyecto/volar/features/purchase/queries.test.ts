import { describe, expect, it } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { getBookingComprobantes, getBookingForPayment, isHoldExpired } from "./queries";

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "RES_1",
    code: "DEMO0001",
    status: "PENDING_PAYMENT",
    seatClass: "ECONOMY",
    quantity: 3,
    unitPrice: { toString: () => "45000" },
    totalAmount: { toString: () => "135000" },
    holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    contactName: "Pasajero Demo",
    contactEmail: "demo@volar.test",
    flight: {
      id: "VUE_1",
      code: "VU-DEMO-01",
      date: new Date("2026-10-29T00:00:00.000Z"),
      departureAt: new Date("2026-10-29T08:30:00.000Z"),
      arrivalAt: new Date("2026-10-29T11:30:00.000Z"),
      route: {
        origin: { code: "DEM1", city: "Ciudad Demo" },
        destination: { code: "DEM2", city: "Destino Demo" },
      },
      airplane: { model: "Airbus A320 (demo)" },
    },
    tickets: [
      { firstName: "María", lastName: "Demo", documentType: "DNI", documentNumber: "30000001" },
      { firstName: "Juan", lastName: "Demo", documentType: "DNI", documentNumber: "30000002" },
      { firstName: "Ana", lastName: "Demo", documentType: "DNI", documentNumber: "30000003" },
    ],
    ...overrides,
  };
}

describe("getBookingForPayment (US-20)", () => {
  it("devuelve la reserva mapeada con su vuelo, importe y pasajeros", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(bookingRow() as never);

    const result = await getBookingForPayment("DEMO0001");

    expect(prismaMock.booking.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { code: "DEMO0001" } }),
    );
    expect(result).toMatchObject({
      code: "DEMO0001",
      status: "PENDING_PAYMENT",
      quantity: 3,
      unitPrice: "45000",
      totalAmount: "135000",
      flight: {
        code: "VU-DEMO-01",
        airplaneModel: "Airbus A320 (demo)",
        origin: { code: "DEM1", city: "Ciudad Demo" },
        destination: { code: "DEM2", city: "Destino Demo" },
      },
      passengers: [
        { firstName: "María", documentNumber: "30000001" },
        { firstName: "Juan", documentNumber: "30000002" },
        { firstName: "Ana", documentNumber: "30000003" },
      ],
    });
  });

  it("devuelve null si el código no existe", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(null);

    expect(await getBookingForPayment("NADA0000")).toBeNull();
  });
});

describe("isHoldExpired (US-17)", () => {
  const now = new Date("2026-10-15T12:00:00.000Z");

  it("es false mientras la retención siga vigente", () => {
    expect(isHoldExpired(new Date("2026-10-15T12:05:00.000Z"), now)).toBe(false);
  });

  it("es true si venció (incluido el instante exacto)", () => {
    expect(isHoldExpired(new Date("2026-10-15T11:59:59.000Z"), now)).toBe(true);
    expect(isHoldExpired(now, now)).toBe(true);
  });
});

function comprobantesRow(overrides: Record<string, unknown> = {}) {
  const issuedAt = new Date("2026-10-07T12:00:00.000Z");
  return {
    code: "DEMO0001",
    status: "CONFIRMED",
    seatClass: "ECONOMY",
    quantity: 2,
    totalAmount: { toString: () => "90000" },
    confirmedAt: issuedAt,
    contactEmail: "demo@volar.test",
    // US-26: tras reprogramar, el vuelo de la reserva queda en el original.
    flight: {
      code: "VU-DEMO-01",
      date: new Date("2026-10-29T00:00:00.000Z"),
      departureAt: new Date("2026-10-29T08:30:00.000Z"),
      arrivalAt: new Date("2026-10-29T11:30:00.000Z"),
      route: {
        origin: { code: "DEM1", city: "Ciudad Demo" },
        destination: { code: "DEM2", city: "Destino Demo" },
      },
    },
    tickets: [
      {
        id: "PAS_1",
        number: "ETK-DEMO0001-1",
        seat: "1A",
        seatClass: "ECONOMY",
        firstName: "María",
        lastName: "Demo",
        documentType: "DNI",
        documentNumber: "30000001",
        issuedAt,
        flight: {
          code: "VU-DEMO-02",
          date: new Date("2026-10-30T00:00:00.000Z"),
          departureAt: new Date("2026-10-30T09:00:00.000Z"),
          arrivalAt: new Date("2026-10-30T12:00:00.000Z"),
          route: {
            origin: { code: "DEM3", city: "Ciudad Nueva" },
            destination: { code: "DEM4", city: "Destino Nuevo" },
          },
        },
      },
      {
        id: "PAS_2",
        number: "ETK-DEMO0001-2",
        seat: "1B",
        seatClass: "ECONOMY",
        firstName: "Juan",
        lastName: "Demo",
        documentType: "DNI",
        documentNumber: "30000002",
        issuedAt,
        flight: {
          code: "VU-DEMO-02",
          date: new Date("2026-10-30T00:00:00.000Z"),
          departureAt: new Date("2026-10-30T09:00:00.000Z"),
          arrivalAt: new Date("2026-10-30T12:00:00.000Z"),
          route: {
            origin: { code: "DEM3", city: "Ciudad Nueva" },
            destination: { code: "DEM4", city: "Destino Nuevo" },
          },
        },
      },
    ],
    invoice: {
      id: "FAC_1",
      number: 1,
      customerName: "Pasajero Demo",
      customerEmail: "demo@volar.test",
      totalAmount: { toString: () => "90000" },
      issuedAt,
      items: [
        {
          description: "Pasaje Economy VU-DEMO-01 - Demo, María",
          quantity: 1,
          unitPrice: { toString: () => "45000" },
          amount: { toString: () => "45000" },
        },
        {
          description: "Pasaje Economy VU-DEMO-01 - Demo, Juan",
          quantity: 1,
          unitPrice: { toString: () => "45000" },
          amount: { toString: () => "45000" },
        },
      ],
    },
    emails: [{ status: "SENT", sentAt: issuedAt, recipientEmail: "demo@volar.test" }],
    payments: [{ transactionId: "TX-ABCDEF123456" }],
    ...overrides,
  };
}

describe("getBookingComprobantes (US-23/US-24)", () => {
  it("devuelve los e-tickets, la factura y el correo de la compra", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(comprobantesRow() as never);

    const result = await getBookingComprobantes("DEMO0001");

    expect(prismaMock.booking.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { code: "DEMO0001" } }),
    );
    expect(result).toMatchObject({
      code: "DEMO0001",
      status: "CONFIRMED",
      totalAmount: "90000",
      confirmedAt: new Date("2026-10-07T12:00:00.000Z"),
      flight: {
        code: "VU-DEMO-01",
        origin: { code: "DEM1", city: "Ciudad Demo" },
        destination: { code: "DEM2", city: "Destino Demo" },
      },
      tickets: [
        {
          number: "ETK-DEMO0001-1",
          seat: "1A",
          documentNumber: "30000001",
          flight: {
            code: "VU-DEMO-02",
            origin: { code: "DEM3", city: "Ciudad Nueva" },
            destination: { code: "DEM4", city: "Destino Nuevo" },
          },
        },
        {
          number: "ETK-DEMO0001-2",
          seat: "1B",
          documentNumber: "30000002",
          flight: { code: "VU-DEMO-02" },
        },
      ],
      invoice: {
        number: 1,
        totalAmount: "90000",
        items: [
          { quantity: 1, unitPrice: "45000", amount: "45000" },
          { quantity: 1, unitPrice: "45000", amount: "45000" },
        ],
      },
      email: { status: "SENT", recipientEmail: "demo@volar.test" },
      transactionId: "TX-ABCDEF123456",
    });
  });

  it("mapea el vuelo de cada pasaje desde el ticket y no desde la reserva", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(comprobantesRow() as never);

    const result = await getBookingComprobantes("DEMO0001");

    expect(result?.flight.code).toBe("VU-DEMO-01");
    expect(result?.tickets.map((ticket) => ticket.flight.code)).toEqual([
      "VU-DEMO-02",
      "VU-DEMO-02",
    ]);
    expect(result?.tickets[0].flight.origin).toEqual({ code: "DEM3", city: "Ciudad Nueva" });
    expect(result?.tickets[0].flight.destination).toEqual({
      code: "DEM4",
      city: "Destino Nuevo",
    });
  });

  it("devuelve null si el código no existe", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(null);

    expect(await getBookingComprobantes("NADA0000")).toBeNull();
  });
});
