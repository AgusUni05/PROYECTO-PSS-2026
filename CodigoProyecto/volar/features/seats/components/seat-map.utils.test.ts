import { describe, expect, it } from "vitest";
import { changedSeats, nextPassenger, pickSeat } from "./seat-map.utils";

describe("pickSeat (US-37)", () => {
  const assignments = { PAS_1: "5A", PAS_2: "5B" };

  it("asigna un asiento libre al pasajero activo", () => {
    expect(pickSeat(assignments, "PAS_1", "7C")).toEqual({ PAS_1: "7C", PAS_2: "5B" });
  });

  it("si el asiento era de otro pasajero de la reserva, intercambian", () => {
    expect(pickSeat(assignments, "PAS_1", "5B")).toEqual({ PAS_1: "5B", PAS_2: "5A" });
  });

  it("elegir el asiento propio no cambia nada", () => {
    expect(pickSeat(assignments, "PAS_1", "5A")).toBe(assignments);
  });
});

describe("nextPassenger (US-37)", () => {
  it("pasa al siguiente y se queda en el último", () => {
    expect(nextPassenger(["PAS_1", "PAS_2"], "PAS_1")).toBe("PAS_2");
    expect(nextPassenger(["PAS_1", "PAS_2"], "PAS_2")).toBe("PAS_2");
  });
});

describe("changedSeats (US-37)", () => {
  it("devuelve solo los pasajeros con asiento nuevo", () => {
    expect(changedSeats({ PAS_1: "5A", PAS_2: "5B" }, { PAS_1: "5B", PAS_2: "5A" })).toEqual([
      { ticketId: "PAS_1", seat: "5B" },
      { ticketId: "PAS_2", seat: "5A" },
    ]);
    expect(changedSeats({ PAS_1: "5A" }, { PAS_1: "5A" })).toEqual([]);
  });
});
