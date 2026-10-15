import { describe, expect, it } from "vitest";
import { newId } from "@/lib/id";
import { confirmPurchaseSchema, purchaseSelectionSchema } from "./schema";

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

describe("confirmPurchaseSchema (US-15)", () => {
  const vuelo = newId("Flight");
  const base = { vuelo, clase: "ECONOMY" as const };

  it("acepta cantidades entre 1 y 9", () => {
    expect(confirmPurchaseSchema.safeParse({ ...base, cantidad: 1 }).success).toBe(true);
    expect(confirmPurchaseSchema.safeParse({ ...base, cantidad: 9 }).success).toBe(true);
    expect(confirmPurchaseSchema.safeParse({ ...base, cantidad: 5 }).success).toBe(true);
  });

  it("rechaza cantidad menor a 1", () => {
    expect(confirmPurchaseSchema.safeParse({ ...base, cantidad: 0 }).success).toBe(false);
    expect(confirmPurchaseSchema.safeParse({ ...base, cantidad: -1 }).success).toBe(false);
  });

  it("rechaza cantidad mayor a 9", () => {
    expect(confirmPurchaseSchema.safeParse({ ...base, cantidad: 10 }).success).toBe(false);
  });

  it("rechaza cantidades no enteras", () => {
    expect(confirmPurchaseSchema.safeParse({ ...base, cantidad: 2.5 }).success).toBe(false);
  });

  it("rechaza cantidad faltante o inválida", () => {
    expect(confirmPurchaseSchema.safeParse(base).success).toBe(false);
    expect(confirmPurchaseSchema.safeParse({ ...base, cantidad: "abc" }).success).toBe(false);
  });

  it("acepta cantidad como string numérico (viene de un form)", () => {
    expect(confirmPurchaseSchema.safeParse({ ...base, cantidad: "3" }).success).toBe(true);
  });
});
