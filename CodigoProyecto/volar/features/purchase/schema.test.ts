import { describe, expect, it } from "vitest";
import { newId } from "@/lib/id";
import { purchaseSelectionSchema } from "./schema";

describe("purchaseSelectionSchema (US-14)", () => {
  const vuelo = newId("Flight");

  it("acepta un vuelo y una clase válidos", () => {
    expect(purchaseSelectionSchema.safeParse({ vuelo, clase: "ECONOMY" }).success).toBe(true);
    expect(purchaseSelectionSchema.safeParse({ vuelo, clase: "FIRST" }).success).toBe(true);
  });

  it("rechaza una clase inexistente", () => {
    expect(purchaseSelectionSchema.safeParse({ vuelo, clase: "BUSINESS" }).success).toBe(false);
  });

  it("rechaza ids que no son de vuelo o parámetros faltantes", () => {
    expect(
      purchaseSelectionSchema.safeParse({ vuelo: newId("Route"), clase: "ECONOMY" }).success,
    ).toBe(false);
    expect(purchaseSelectionSchema.safeParse({}).success).toBe(false);
  });

  it("rechaza parámetros repetidos en la URL (llegan como array)", () => {
    expect(purchaseSelectionSchema.safeParse({ vuelo: [vuelo, vuelo], clase: "FIRST" }).success).toBe(
      false,
    );
  });
});
