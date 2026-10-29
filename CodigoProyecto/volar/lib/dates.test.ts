import { afterEach, describe, expect, it, vi } from "vitest";
import { maxFlightDateString } from "./dates";

describe("maxFlightDateString", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("devuelve el último día del mismo mes un año después", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T12:00:00.000Z"));

    expect(maxFlightDateString()).toBe("2027-10-31");
  });

  it("ajusta el fin de mes en años bisiestos", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2028-02-15T12:00:00.000Z"));

    expect(maxFlightDateString()).toBe("2029-02-28");
  });

  it("cierra el año en diciembre", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-31T12:00:00.000Z"));

    expect(maxFlightDateString()).toBe("2027-12-31");
  });
});
