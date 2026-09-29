import { describe, expect, it } from "vitest";
import { formatDate, formatLongDate, formatTime } from "./format";

describe("format", () => {
  it("formatea fecha y hora en UTC", () => {
    const date = new Date("2026-10-02T08:30:00.000Z");
    expect(formatDate(date)).toBe("02/10/2026");
    expect(formatTime(date)).toBe("08:30");
  });

  it("formatea la fecha larga con el día de la semana en mayúscula", () => {
    expect(formatLongDate(new Date("2026-10-02T00:00:00.000Z"))).toBe(
      "Viernes 02 de octubre de 2026",
    );
  });
});
