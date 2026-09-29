import { describe, expect, it } from "vitest";
import { buildFlightWindow, matchingDates, windowsOverlap } from "./generation";

describe("matchingDates", () => {
  it("devuelve las fechas cuyo día de semana coincide (un día operativo)", () => {
    // 2026-10-01 es jueves; la semana siguiente cae en 2026-10-08.
    const dates = matchingDates("2026-10-01", "2026-10-08", ["THURSDAY"]);
    expect(dates.map((d) => d.toISOString().slice(0, 10))).toEqual(["2026-10-01", "2026-10-08"]);
  });

  it("devuelve varias fechas por semana cuando hay varios días operativos", () => {
    // 2026-10-01 (jue) a 2026-10-07 (mié): Lun 10-05, Mié 10-07.
    const dates = matchingDates("2026-10-01", "2026-10-07", ["MONDAY", "WEDNESDAY"]);
    expect(dates.map((d) => d.toISOString().slice(0, 10))).toEqual(["2026-10-05", "2026-10-07"]);
  });

  it("devuelve un array vacío si ningún día del rango coincide", () => {
    const dates = matchingDates("2026-10-01", "2026-10-02", ["MONDAY"]);
    expect(dates).toEqual([]);
  });

  it("incluye la única fecha cuando startDate == endDate y coincide", () => {
    const dates = matchingDates("2026-10-01", "2026-10-01", ["THURSDAY"]);
    expect(dates).toHaveLength(1);
  });

  it("no incluye nada cuando startDate == endDate y no coincide", () => {
    const dates = matchingDates("2026-10-01", "2026-10-01", ["FRIDAY"]);
    expect(dates).toEqual([]);
  });
});

describe("buildFlightWindow", () => {
  it("arma la ventana dentro del mismo día", () => {
    const date = new Date("2026-10-02T00:00:00.000Z");
    const w = buildFlightWindow(date, "08:30", "10:00");
    expect(w.departureAt.toISOString()).toBe("2026-10-02T08:30:00.000Z");
    expect(w.arrivalAt.toISOString()).toBe("2026-10-02T10:00:00.000Z");
  });

  it("suma un día a la llegada cuando cruza medianoche", () => {
    const date = new Date("2026-10-02T00:00:00.000Z");
    const w = buildFlightWindow(date, "23:30", "01:15");
    expect(w.departureAt.toISOString()).toBe("2026-10-02T23:30:00.000Z");
    expect(w.arrivalAt.toISOString()).toBe("2026-10-03T01:15:00.000Z");
  });
});

describe("windowsOverlap", () => {
  it("es true cuando dos ventanas se superponen", () => {
    const a = { departureAt: new Date("2026-10-02T08:00:00Z"), arrivalAt: new Date("2026-10-02T10:00:00Z") };
    const b = { departureAt: new Date("2026-10-02T09:00:00Z"), arrivalAt: new Date("2026-10-02T11:00:00Z") };
    expect(windowsOverlap(a, b)).toBe(true);
  });

  it("es false cuando no se superponen", () => {
    const a = { departureAt: new Date("2026-10-02T08:00:00Z"), arrivalAt: new Date("2026-10-02T09:00:00Z") };
    const b = { departureAt: new Date("2026-10-02T12:00:00Z"), arrivalAt: new Date("2026-10-02T13:00:00Z") };
    expect(windowsOverlap(a, b)).toBe(false);
  });

  it("es false cuando una llega justo cuando sale la otra (tocan en el borde)", () => {
    const a = { departureAt: new Date("2026-10-02T08:00:00Z"), arrivalAt: new Date("2026-10-02T10:00:00Z") };
    const b = { departureAt: new Date("2026-10-02T10:00:00Z"), arrivalAt: new Date("2026-10-02T12:00:00Z") };
    expect(windowsOverlap(a, b)).toBe(false);
  });
});
