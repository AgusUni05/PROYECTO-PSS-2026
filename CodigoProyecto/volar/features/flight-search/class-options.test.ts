import { describe, expect, it } from "vitest";
import { buildClassOptions, LAST_SEATS_THRESHOLD } from "./class-options";

const flight = {
  economyFare: "45000",
  economyAvailable: 142,
  firstClassFare: "95000",
  firstClassAvailable: 12,
};

describe("buildClassOptions (US-14)", () => {
  it("arma una opción por clase con su tarifa y cupo", () => {
    expect(buildClassOptions(flight)).toEqual([
      { seatClass: "ECONOMY", label: "Economy", fare: "45000", available: 142, status: "available" },
      { seatClass: "FIRST", label: "Primera Clase", fare: "95000", available: 12, status: "available" },
    ]);
  });

  it("marca los últimos cupos cuando quedan pocos", () => {
    const [economy] = buildClassOptions({ ...flight, economyAvailable: LAST_SEATS_THRESHOLD });
    expect(economy.status).toBe("last-seats");
  });

  it("marca como agotada la clase sin cupo, sin afectar a la otra", () => {
    const [economy, first] = buildClassOptions({ ...flight, firstClassAvailable: 0 });
    expect(first.status).toBe("sold-out");
    expect(economy.status).toBe("available");
  });
});
