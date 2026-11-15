import { describe, expect, it } from "vitest";
import { cabinSection } from "./cabin";

const CABIN = { economyCapacity: 15, firstClassCapacity: 6 };

describe("cabinSection (US-37)", () => {
  it("arma Primera con 4 asientos por fila desde la fila 1", () => {
    const first = cabinSection(CABIN, "FIRST");

    expect(first.letters).toEqual(["A", "B", "C", "D"]);
    expect(first.rows).toEqual([
      { number: 1, seats: ["1A", "1B", "1C", "1D"] },
      { number: 2, seats: ["2A", "2B"] },
    ]);
  });

  it("arma Economy con 6 asientos por fila desde la fila 1, como la emisión de la compra", () => {
    const economy = cabinSection(CABIN, "ECONOMY");

    expect(economy.rows.map((row) => row.number)).toEqual([1, 2, 3]);
    expect(economy.seats).toHaveLength(15);
    expect(economy.seats.slice(0, 2)).toEqual(["1A", "1B"]);
    expect(economy.seats.at(-1)).toBe("3C");
  });

  it("una clase sin capacidad no tiene asientos", () => {
    expect(cabinSection({ economyCapacity: 6, firstClassCapacity: 0 }, "FIRST")).toMatchObject({
      rows: [],
      seats: [],
    });
  });
});
