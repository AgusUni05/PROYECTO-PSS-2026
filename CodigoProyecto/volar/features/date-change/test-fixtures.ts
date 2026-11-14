// US-39: vuelo candidato como lo devuelve Prisma, para los tests del cambio de fecha.
export function candidateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "VUE_NUEVO",
    code: "VU-20261123-002",
    date: new Date("2026-11-23T00:00:00.000Z"),
    departureAt: new Date("2026-11-23T08:30:00.000Z"),
    arrivalAt: new Date("2026-11-23T10:00:00.000Z"),
    status: "SCHEDULED",
    economyCapacity: 100,
    economyOccupied: 10,
    firstClassCapacity: 16,
    firstClassOccupied: 0,
    economyFare: { toString: () => "48000" },
    firstClassFare: { toString: () => "95000" },
    salesPeriod: {
      startDate: new Date("2026-11-01T00:00:00.000Z"),
      endDate: new Date("2026-11-30T00:00:00.000Z"),
    },
    ...overrides,
  };
}
