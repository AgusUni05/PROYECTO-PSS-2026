import { describe, expect, it } from "vitest";
import { availableSeats, hasAvailableSeats, isOnSale, type SaleCheckFlight } from "./availability";

describe("availableSeats", () => {
  it("es capacidad menos ocupados", () => {
    expect(availableSeats(150, 8)).toBe(142);
  });

  it("es 0 cuando la clase está completa", () => {
    expect(availableSeats(16, 16)).toBe(0);
  });

  it("nunca es negativo", () => {
    expect(availableSeats(10, 12)).toBe(0);
  });
});

describe("hasAvailableSeats (US-13)", () => {
  const seats = { economyCapacity: 150, economyOccupied: 0, firstClassCapacity: 16, firstClassOccupied: 0 };

  it("es true si queda cupo en alguna clase", () => {
    expect(hasAvailableSeats({ ...seats, economyOccupied: 150 })).toBe(true);
    expect(hasAvailableSeats({ ...seats, firstClassOccupied: 16 })).toBe(true);
  });

  it("es false si ambas clases están completas", () => {
    expect(hasAvailableSeats({ ...seats, economyOccupied: 150, firstClassOccupied: 16 })).toBe(
      false,
    );
  });

  it("es false si una clase sin capacidad y la otra completa", () => {
    expect(
      hasAvailableSeats({ ...seats, economyOccupied: 150, firstClassCapacity: 0 }),
    ).toBe(false);
  });
});

describe("isOnSale (US-08/US-11/US-13)", () => {
  const now = new Date("2026-10-01T12:00:00.000Z");

  const flight: SaleCheckFlight = {
    status: "SCHEDULED",
    date: new Date("2026-10-02T00:00:00.000Z"),
    departureAt: new Date("2026-10-02T08:30:00.000Z"),
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

  it("es true para un vuelo programado, futuro, con tarifas, en período y con cupo", () => {
    expect(isOnSale(flight, now)).toBe(true);
  });

  it("acepta tarifas como Decimal de Prisma (objeto con toString)", () => {
    expect(isOnSale({ ...flight, economyFare: { toString: () => "45000.00" } }, now)).toBe(true);
  });

  it("excluye vuelos cancelados", () => {
    expect(isOnSale({ ...flight, status: "CANCELLED" }, now)).toBe(false);
  });

  it("excluye vuelos que ya partieron", () => {
    expect(isOnSale({ ...flight, departureAt: new Date("2026-10-01T11:00:00.000Z") }, now)).toBe(
      false,
    );
  });

  it("excluye vuelos sin tarifa en alguna clase", () => {
    expect(isOnSale({ ...flight, firstClassFare: 0 }, now)).toBe(false);
  });

  it("excluye vuelos fuera de su período de venta", () => {
    expect(
      isOnSale(
        {
          ...flight,
          salesPeriod: {
            startDate: new Date("2026-10-05T00:00:00.000Z"),
            endDate: new Date("2026-10-31T00:00:00.000Z"),
          },
        },
        now,
      ),
    ).toBe(false);
  });

  it("excluye vuelos sin cupo en ninguna clase", () => {
    expect(isOnSale({ ...flight, economyOccupied: 150, firstClassOccupied: 16 }, now)).toBe(false);
  });
});
