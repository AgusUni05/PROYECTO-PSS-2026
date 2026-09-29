import { describe, expect, it } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { searchFlights } from "./queries";

const inOneWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

function flightRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "VUE_1",
    code: "VU-20261002-001",
    status: "SCHEDULED",
    date: new Date(inOneWeek.toISOString().slice(0, 10)),
    departureAt: inOneWeek,
    arrivalAt: new Date(inOneWeek.getTime() + 90 * 60 * 1000),
    economyCapacity: 150,
    economyOccupied: 8,
    firstClassCapacity: 16,
    firstClassOccupied: 16,
    economyFare: { toString: () => "45000" },
    firstClassFare: { toString: () => "95000" },
    route: {
      origin: { code: "AEP", city: "Buenos Aires" },
      destination: { code: "COR", city: "Córdoba" },
    },
    airplane: { model: "Boeing 737-800" },
    salesPeriod: {
      startDate: new Date("2000-01-01T00:00:00.000Z"),
      endDate: new Date("2100-01-01T00:00:00.000Z"),
    },
    ...overrides,
  };
}

const params = { origen: "AER_ORIGEN", destino: "AER_DESTINO", fecha: "2026-10-02" };

describe("searchFlights (US-13)", () => {
  it("busca vuelos programados del trayecto en la fecha, ordenados por hora de salida", async () => {
    prismaMock.flight.findMany.mockResolvedValue([]);

    await searchFlights(params);

    expect(prismaMock.flight.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "SCHEDULED",
          date: new Date("2026-10-02T00:00:00.000Z"),
          route: { originId: "AER_ORIGEN", destinationId: "AER_DESTINO" },
        },
        orderBy: { departureAt: "asc" },
      }),
    );
  });

  it("devuelve cada vuelo con tarifas y cupo disponible por clase", async () => {
    prismaMock.flight.findMany.mockResolvedValue([flightRow()] as never);

    const [result] = await searchFlights(params);

    expect(result).toMatchObject({
      id: "VUE_1",
      code: "VU-20261002-001",
      airplaneModel: "Boeing 737-800",
      origin: { code: "AEP", city: "Buenos Aires" },
      destination: { code: "COR", city: "Córdoba" },
      economyFare: "45000",
      economyAvailable: 142,
      firstClassFare: "95000",
      firstClassAvailable: 0,
    });
  });

  it("descarta los vuelos que no están a la venta (sin cupo, sin tarifa, fuera de período) y conserva el orden", async () => {
    prismaMock.flight.findMany.mockResolvedValue([
      flightRow({ id: "VUE_TEMPRANO" }),
      flightRow({ id: "VUE_LLENO", economyOccupied: 150 }),
      flightRow({ id: "VUE_SIN_TARIFA", economyFare: { toString: () => "0" } }),
      flightRow({
        id: "VUE_FUERA_DE_PERIODO",
        salesPeriod: {
          startDate: new Date("2000-01-01T00:00:00.000Z"),
          endDate: new Date("2000-01-02T00:00:00.000Z"),
        },
      }),
      flightRow({ id: "VUE_TARDE" }),
    ] as never);

    const results = await searchFlights(params);

    expect(results.map((r) => r.id)).toEqual(["VUE_TEMPRANO", "VUE_TARDE"]);
  });
});
