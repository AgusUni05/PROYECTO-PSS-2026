import { describe, expect, it } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { getBookingForPayment, isHoldExpired } from "./queries";

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
