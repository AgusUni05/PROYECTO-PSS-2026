import { describe, expect, it, beforeEach } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { getOccupancyReport } from "./queries";

const flightRow = {
  id: "VUE_1",
  code: "VU-20261002-01",
  date: new Date("2026-10-02T00:00:00.000Z"),
  economyCapacity: 150,
  economyOccupied: 142,
  firstClassCapacity: 16,
  firstClassOccupied: 12,
  route: { origin: { code: "AEP" }, destination: { code: "COR" } },
  airplane: { model: "Boeing 737-800" },
  tickets: [{ unitPrice: 45000 }, { unitPrice: 45000 }],
};

beforeEach(() => {
  prismaMock.flight.count.mockResolvedValue(1);
  prismaMock.flight.findMany.mockResolvedValue([flightRow] as never);
  prismaMock.flight.aggregate.mockResolvedValue({
    _sum: {
      economyCapacity: 150,
      economyOccupied: 142,
      firstClassCapacity: 16,
      firstClassOccupied: 12,
    },
  } as never);
  prismaMock.ticket.aggregate.mockResolvedValue({ _sum: { unitPrice: 90000 } } as never);
});

describe("getOccupancyReport (US-27)", () => {
  it("devuelve el detalle por vuelo con capacidad y ocupación por clase", async () => {
    const report = await getOccupancyReport({});

    expect(report.flights).toHaveLength(1);
    expect(report.flights[0]).toMatchObject({
      code: "VU-20261002-01",
      originCode: "AEP",
      destinationCode: "COR",
      economyCapacity: 150,
      economySold: 142,
      firstClassCapacity: 16,
      firstClassSold: 12,
    });
  });

  it("calcula los KPIs globales sobre todo el período filtrado, no solo la página actual", async () => {
    const report = await getOccupancyReport({});

    // (142+12) vendidos sobre (150+16) de capacidad total
    expect(report.summary.totalCapacity).toBe(166);
    expect(report.summary.totalSold).toBe(154);
    expect(report.summary.occupancyRate).toBeCloseTo(92.8, 1);
    expect(report.summary.grossRevenue).toBe("90000");
  });

  it("con clase=ECONOMY, los KPIs globales solo consideran Economy", async () => {
    const report = await getOccupancyReport({ clase: "ECONOMY" });

    expect(report.summary.totalCapacity).toBe(150);
    expect(report.summary.totalSold).toBe(142);
  });

  it("filtra por ruta cuando se indica", async () => {
    await getOccupancyReport({ ruta: "TRA_01" });

    expect(prismaMock.flight.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ routeId: "TRA_01" }),
    });
  });
});
