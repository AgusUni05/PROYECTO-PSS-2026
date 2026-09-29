import { describe, expect, it } from "vitest";
import { availableSeats } from "./availability";

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
