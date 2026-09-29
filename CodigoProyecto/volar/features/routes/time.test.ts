import { describe, expect, it } from "vitest";
import { formatDuration, isNextDayArrival } from "./time";

describe("isNextDayArrival", () => {
  it("es false cuando la llegada es el mismo día", () => {
    expect(isNextDayArrival("08:30", "10:00")).toBe(false);
  });

  it("es true cuando la llegada cruza la medianoche", () => {
    expect(isNextDayArrival("23:30", "01:15")).toBe(true);
  });
});

describe("formatDuration", () => {
  it("calcula la duración dentro del mismo día", () => {
    expect(formatDuration("08:30", "10:00")).toBe("1h 30m");
  });

  it("calcula la duración cruzando medianoche", () => {
    expect(formatDuration("23:30", "01:15")).toBe("1h 45m");
  });

  it("omite los minutos cuando la duración es exacta en horas", () => {
    expect(formatDuration("10:00", "12:00")).toBe("2h");
  });
});
