import { describe, expect, it } from "vitest";
import type { FlightSearchResult } from "./queries";
import { buildFlexibleDays } from "./flexible-dates";

function result(date: string, overrides: Partial<FlightSearchResult> = {}): FlightSearchResult {
  return {
    id: `VUE_${date}`,
    code: `VU-${date.replaceAll("-", "")}-001`,
    date: new Date(`${date}T00:00:00.000Z`),
    departureAt: new Date(`${date}T08:30:00.000Z`),
    arrivalAt: new Date(`${date}T10:00:00.000Z`),
    airplaneModel: "Boeing 737-800",
    origin: { id: "AER_AEP", code: "AEP", city: "Buenos Aires" },
    destination: { id: "AER_COR", code: "COR", city: "Córdoba" },
    economyFare: "45000",
    economyAvailable: 100,
    firstClassFare: "95000",
    firstClassAvailable: 10,
    ...overrides,
  };
}

const WIDE_BOUNDS = { min: "2026-01-01", max: "2027-12-31" };

describe("buildFlexibleDays (US-42)", () => {
  it("arma los 7 días de -3 a +3 alrededor de la fecha buscada, en orden", () => {
    const days = buildFlexibleDays("2026-10-01", [], WIDE_BOUNDS);

    expect(days.map((d) => [d.offset, d.date])).toEqual([
      [-3, "2026-09-28"],
      [-2, "2026-09-29"],
      [-1, "2026-09-30"],
      [0, "2026-10-01"],
      [1, "2026-10-02"],
      [2, "2026-10-03"],
      [3, "2026-10-04"],
    ]);
    expect(days.every((d) => d.status === "empty")).toBe(true);
  });

  it("agrupa los vuelos por día con cantidad de vuelos, cupos y la menor tarifa", () => {
    const days = buildFlexibleDays(
      "2026-10-01",
      [
        result("2026-10-02", { id: "VUE_A", economyFare: "50000", economyAvailable: 100, firstClassAvailable: 10 }),
        result("2026-10-02", { id: "VUE_B", economyFare: "45000", economyAvailable: 30, firstClassAvailable: 7 }),
      ],
      WIDE_BOUNDS,
    );

    expect(days.find((d) => d.offset === 1)).toMatchObject({
      status: "available",
      flightCount: 2,
      availableSeats: 147,
      minFare: "45000",
    });
    expect(days.find((d) => d.offset === 0)).toMatchObject({
      status: "empty",
      flightCount: 0,
      availableSeats: 0,
      minFare: null,
    });
  });

  it("no toma la tarifa de una clase agotada como la menor del día", () => {
    const [day] = buildFlexibleDays(
      "2026-10-01",
      [result("2026-09-28", { economyFare: "40000", economyAvailable: 0, firstClassFare: "90000", firstClassAvailable: 4 })],
      WIDE_BOUNDS,
    );

    expect(day).toMatchObject({ offset: -3, minFare: "90000", availableSeats: 4 });
  });

  it("marca como menor precio al día más barato", () => {
    const days = buildFlexibleDays(
      "2026-10-01",
      [
        result("2026-09-28", { economyFare: "42000" }),
        result("2026-09-30", { economyFare: "41000" }),
        result("2026-10-04", { economyFare: "43000" }),
      ],
      WIDE_BOUNDS,
    );

    expect(days.filter((d) => d.isCheapest).map((d) => d.date)).toEqual(["2026-09-30"]);
  });

  it("si varios días empatan en el precio más bajo, los marca a todos", () => {
    const days = buildFlexibleDays(
      "2026-10-01",
      [
        result("2026-09-28", { economyFare: "42000" }),
        result("2026-09-30", { economyFare: "41000" }),
        result("2026-10-04", { economyFare: "41000" }),
      ],
      WIDE_BOUNDS,
    );

    expect(days.filter((d) => d.isCheapest).map((d) => d.date)).toEqual(["2026-09-30", "2026-10-04"]);
  });

  it("no marca menor precio si todos los días con vuelos cuestan lo mismo", () => {
    const days = buildFlexibleDays(
      "2026-10-01",
      [result("2026-09-28"), result("2026-09-30"), result("2026-10-02")],
      WIDE_BOUNDS,
    );

    expect(days.some((d) => d.isCheapest)).toBe(false);
  });

  it("no marca menor precio cuando hay un solo día con vuelos", () => {
    const days = buildFlexibleDays("2026-10-01", [result("2026-10-02")], WIDE_BOUNDS);

    expect(days.some((d) => d.isCheapest)).toBe(false);
  });

  it("marca no disponibles los días fuera del rango buscable (antes de hoy o después del máximo)", () => {
    const days = buildFlexibleDays("2026-10-01", [], { min: "2026-09-30", max: "2026-10-03" });

    expect(days.map((d) => d.status)).toEqual([
      "unavailable",
      "unavailable",
      "empty",
      "empty",
      "empty",
      "empty",
      "unavailable",
    ]);
  });

  it("cruza el cambio de año", () => {
    const days = buildFlexibleDays("2026-12-31", [result("2027-01-02")], WIDE_BOUNDS);

    expect(days[0].date).toBe("2026-12-28");
    expect(days[6].date).toBe("2027-01-03");
    expect(days.find((d) => d.date === "2027-01-02")).toMatchObject({ offset: 2, status: "available" });
  });
});
