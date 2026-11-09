import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { getFlightOnSale, searchFlexibleDates, searchFlights } from "./queries";

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
      origin: { id: "AER_AEP", code: "AEP", city: "Buenos Aires" },
      destination: { id: "AER_COR", code: "COR", city: "Córdoba" },
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
      origin: { id: "AER_AEP", code: "AEP", city: "Buenos Aires" },
      destination: { id: "AER_COR", code: "COR", city: "Córdoba" },
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

describe("getFlightOnSale (US-14 / US-08)", () => {
  it("devuelve el vuelo si sigue a la venta", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(flightRow() as never);

    const result = await getFlightOnSale("VUE_1");

    expect(result).toMatchObject({ id: "VUE_1", economyAvailable: 142, firstClassAvailable: 0 });
    expect(prismaMock.flight.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "VUE_1" } }),
    );
  });

  it("devuelve null si el vuelo no existe", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(null);

    expect(await getFlightOnSale("VUE_1")).toBeNull();
  });

  it("rechaza un intento directo sobre un vuelo cancelado o fuera de período", async () => {
    prismaMock.flight.findUnique.mockResolvedValueOnce(flightRow({ status: "CANCELLED" }) as never);
    expect(await getFlightOnSale("VUE_1")).toBeNull();

    prismaMock.flight.findUnique.mockResolvedValueOnce(
      flightRow({
        salesPeriod: {
          startDate: new Date("2000-01-01T00:00:00.000Z"),
          endDate: new Date("2000-01-02T00:00:00.000Z"),
        },
      }) as never,
    );
    expect(await getFlightOnSale("VUE_1")).toBeNull();
  });
});

describe("searchFlexibleDates (US-42)", () => {
  // "Hoy" fijo para que los límites del rango buscable sean deterministas.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function rowOn(date: string, overrides: Record<string, unknown> = {}) {
    return flightRow({
      id: `VUE_${date}`,
      date: new Date(`${date}T00:00:00.000Z`),
      departureAt: new Date(`${date}T15:00:00.000Z`),
      arrivalAt: new Date(`${date}T16:30:00.000Z`),
      ...overrides,
    });
  }

  it("consulta en una sola query los vuelos programados del trayecto entre -3 y +3 días", async () => {
    prismaMock.flight.findMany.mockResolvedValue([]);

    await searchFlexibleDates({ ...params, fecha: "2026-10-10" });

    expect(prismaMock.flight.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.flight.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "SCHEDULED",
          date: {
            gte: new Date("2026-10-07T00:00:00.000Z"),
            lte: new Date("2026-10-13T00:00:00.000Z"),
          },
          route: { originId: "AER_ORIGEN", destinationId: "AER_DESTINO" },
        },
        orderBy: { departureAt: "asc" },
      }),
    );
  });

  it("no consulta días anteriores a hoy y los marca como no disponibles", async () => {
    prismaMock.flight.findMany.mockResolvedValue([]);

    const days = await searchFlexibleDates({ ...params, fecha: "2026-10-02" });

    expect(prismaMock.flight.findMany.mock.calls[0][0]?.where?.date).toEqual({
      gte: new Date("2026-10-01T00:00:00.000Z"),
      lte: new Date("2026-10-05T00:00:00.000Z"),
    });
    expect(days.map((d) => d.status)).toEqual([
      "unavailable",
      "unavailable",
      "empty",
      "empty",
      "empty",
      "empty",
      "empty",
    ]);
  });

  it("resume solo los vuelos a la venta: descarta los agotados y los que ya partieron", async () => {
    prismaMock.flight.findMany.mockResolvedValue([
      // Hoy, pero ya partió (09:00 UTC < 12:00 UTC): no está a la venta.
      rowOn("2026-10-01", { departureAt: new Date("2026-10-01T09:00:00.000Z") }),
      rowOn("2026-10-02", { economyFare: { toString: () => "42000" } }),
      rowOn("2026-10-04", { economyOccupied: 150, firstClassOccupied: 16 }),
    ] as never);

    const days = await searchFlexibleDates({ ...params, fecha: "2026-10-03" });

    expect(days.map((d) => [d.date, d.status, d.minFare])).toEqual([
      ["2026-09-30", "unavailable", null],
      ["2026-10-01", "empty", null],
      ["2026-10-02", "available", "42000"],
      ["2026-10-03", "empty", null],
      ["2026-10-04", "empty", null],
      ["2026-10-05", "empty", null],
      ["2026-10-06", "empty", null],
    ]);
  });
});
