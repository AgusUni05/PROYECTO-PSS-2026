// US-39: fila de reserva cancelable como la devuelve Prisma, para los tests.
export function cancellableBookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "RES_1",
    code: "GNQ47M",
    status: "CONFIRMED",
    payments: [{ cardBrand: "VISA", cardLast4: "1112", gateway: "VolarPay (simulada)" }],
    tickets: [
      {
        id: "PAS_1",
        unitPrice: { toString: () => "45000" },
        seat: "1D",
        seatClass: "ECONOMY",
        firstName: "Franco",
        lastName: "Laza",
        contingencies: [],
        flight: {
          id: "VUE_1",
          code: "VU-20261120-002",
          date: new Date("2026-11-20T00:00:00.000Z"),
          departureAt: new Date("2026-11-20T08:30:00.000Z"),
          status: "SCHEDULED",
          route: {
            origin: { code: "EZE", city: "Buenos Aires" },
            destination: { code: "MDZ", city: "Mendoza" },
          },
        },
      },
    ],
    ...overrides,
  };
}
