import { afterEach, describe, expect, it, vi } from "vitest";
import { addDaysToDateString, maxFlightDateString } from "./dates";

describe("addDaysToDateString (US-42)", () => {
  it("suma y resta días dentro del mismo mes", () => {
    expect(addDaysToDateString("2026-10-15", 3)).toBe("2026-10-18");
    expect(addDaysToDateString("2026-10-15", -3)).toBe("2026-10-12");
    expect(addDaysToDateString("2026-10-15", 0)).toBe("2026-10-15");
  });

  it("cruza el fin de mes y de año", () => {
    expect(addDaysToDateString("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDaysToDateString("2027-01-02", -3)).toBe("2026-12-30");
  });

  it("respeta el 29 de febrero en años bisiestos", () => {
    expect(addDaysToDateString("2028-02-27", 2)).toBe("2028-02-29");
    expect(addDaysToDateString("2027-02-27", 2)).toBe("2027-03-01");
  });
});

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
