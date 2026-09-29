import { describe, expect, it, beforeEach } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { generateFlights } from "./service";
import type { GenerateFlightsFormValues } from "./schema";

const route = {
  id: "TRA_1",
  code: "TR-001",
  originId: "AER_1",
  destinationId: "AER_2",
  operatingDays: ["THURSDAY"],
  departureTime: "08:30",
  arrivalTime: "10:00",
  isActive: true,
};

const airplane = {
  id: "AVI_1",
  identifier: "LV-ARG01",
  model: "Boeing 737-800",
  economySeats: 150,
  firstClassSeats: 16,
  isActive: true,
};

// 2026-10-01 es jueves (único jueves del rango).
const formValues: GenerateFlightsFormValues = {
  routeId: route.id,
  airplaneId: airplane.id,
  startDate: "2026-10-01",
  endDate: "2026-10-01",
  economyCapacity: 150,
  firstClassCapacity: 16,
  economyFare: 45000,
  firstClassFare: 95000,
};

beforeEach(() => {
  prismaMock.$transaction.mockImplementation(async (callback: unknown) => {
    if (typeof callback === "function") {
      return callback(prismaMock);
    }
    return Promise.all(callback as Promise<unknown>[]);
  });
});

describe("generateFlights", () => {
  it("rechaza si el trayecto no existe", async () => {
    prismaMock.route.findUnique.mockResolvedValue(null);

    const result = await generateFlights(formValues, "USU_admin");

    expect(result.ok).toBe(false);
    expect(prismaMock.airplane.findUnique).not.toHaveBeenCalled();
  });

  it("rechaza si el trayecto está inactivo", async () => {
    prismaMock.route.findUnique.mockResolvedValue({ ...route, isActive: false } as never);

    const result = await generateFlights(formValues, "USU_admin");

    expect(result.ok).toBe(false);
  });

  it("rechaza si el avión no existe o está inactivo", async () => {
    prismaMock.route.findUnique.mockResolvedValue(route as never);
    prismaMock.airplane.findUnique.mockResolvedValue({ ...airplane, isActive: false } as never);

    const result = await generateFlights(formValues, "USU_admin");

    expect(result.ok).toBe(false);
    expect(prismaMock.flight.findMany).not.toHaveBeenCalled();
  });

  it("rechaza si el período no contiene ninguna fecha que coincida con los días de operación", async () => {
    prismaMock.route.findUnique.mockResolvedValue(route as never);
    prismaMock.airplane.findUnique.mockResolvedValue(airplane as never);

    // 2026-10-02 es viernes: ningún jueves en el rango.
    const result = await generateFlights(
      { ...formValues, startDate: "2026-10-02", endDate: "2026-10-02" },
      "USU_admin",
    );

    expect(result.ok).toBe(false);
  });

  it("rechaza todo si ya existe un vuelo generado para el trayecto en alguna fecha", async () => {
    prismaMock.route.findUnique.mockResolvedValue(route as never);
    prismaMock.airplane.findUnique.mockResolvedValue(airplane as never);
    prismaMock.flight.findMany.mockResolvedValueOnce([
      { date: new Date("2026-10-01T00:00:00.000Z") },
    ] as never);

    const result = await generateFlights(formValues, "USU_admin");

    expect(result.ok).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rechaza todo si el avión queda con horarios superpuestos", async () => {
    prismaMock.route.findUnique.mockResolvedValue(route as never);
    prismaMock.airplane.findUnique.mockResolvedValue(airplane as never);
    prismaMock.flight.findMany
      .mockResolvedValueOnce([]) // sin vuelos ya generados para el trayecto
      .mockResolvedValueOnce([
        {
          departureAt: new Date("2026-10-01T09:00:00.000Z"),
          arrivalAt: new Date("2026-10-01T11:00:00.000Z"),
          code: "VU-20261001-002",
        },
      ] as never);

    const result = await generateFlights(formValues, "USU_admin");

    expect(result.ok).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("genera el período y un vuelo por fecha en el caso feliz", async () => {
    prismaMock.route.findUnique.mockResolvedValue(route as never);
    prismaMock.airplane.findUnique.mockResolvedValue(airplane as never);
    prismaMock.flight.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    prismaMock.salesPeriod.create.mockResolvedValue({ id: "PER_1" } as never);
    prismaMock.flight.create.mockResolvedValue({} as never);

    const result = await generateFlights(formValues, "USU_admin");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ salesPeriodId: "PER_1", count: 1 });
    }
    expect(prismaMock.salesPeriod.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: expect.stringMatching(/^PER_/),
        routeId: "TRA_1",
        airplaneId: "AVI_1",
        createdById: "USU_admin",
      }),
    });
    expect(prismaMock.flight.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: expect.stringMatching(/^VUE_/),
        code: "VU-20261001-001",
        routeId: "TRA_1",
        salesPeriodId: "PER_1",
        createdById: "USU_admin",
      }),
    });
  });
});
