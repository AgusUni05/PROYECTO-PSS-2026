import { describe, expect, it } from "vitest";
import { newId } from "@/lib/id";
import { installmentAmount, paymentFormSchema, purchaseSelectionSchema } from "./schema";

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

describe("paymentFormSchema (US-20)", () => {
  const valid = {
    medioPago: "CREDIT",
    numeroTarjeta: "4517 8820 9912 4242",
    titular: "Juan Carlos Perez",
    vencimiento: "12/99",
    cvv: "123",
    cuotas: "3",
  };

  it("acepta datos válidos y normaliza el número de tarjeta", () => {
    const parsed = paymentFormSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.numeroTarjeta).toBe("4517882099124242");
    expect(parsed.success && parsed.data.cuotas).toBe(3);
  });

  it("acepta tarjeta de débito y pago en 1 cuota (número como number)", () => {
    expect(
      paymentFormSchema.safeParse({ ...valid, medioPago: "DEBIT", cuotas: 1 }).success,
    ).toBe(true);
  });

  it("rechaza números de tarjeta que no tengan 16 dígitos", () => {
    expect(paymentFormSchema.safeParse({ ...valid, numeroTarjeta: "4517 8820 9912" }).success).toBe(
      false,
    );
    expect(
      paymentFormSchema.safeParse({ ...valid, numeroTarjeta: "45178820991242421" }).success,
    ).toBe(false);
    expect(
      paymentFormSchema.safeParse({ ...valid, numeroTarjeta: "4517-8820-9912-424a" }).success,
    ).toBe(false);
  });

  it("rechaza un vencimiento mal formado o ya vencido", () => {
    expect(paymentFormSchema.safeParse({ ...valid, vencimiento: "13/29" }).success).toBe(false);
    expect(paymentFormSchema.safeParse({ ...valid, vencimiento: "1/29" }).success).toBe(false);
    expect(paymentFormSchema.safeParse({ ...valid, vencimiento: "01/20" }).success).toBe(false);
  });

  it("rechaza un CVV que no tenga 3 o 4 dígitos", () => {
    expect(paymentFormSchema.safeParse({ ...valid, cvv: "12" }).success).toBe(false);
    expect(paymentFormSchema.safeParse({ ...valid, cvv: "12345" }).success).toBe(false);
    expect(paymentFormSchema.safeParse({ ...valid, cvv: "12a" }).success).toBe(false);
  });

  it("rechaza un titular demasiado corto o con números", () => {
    expect(paymentFormSchema.safeParse({ ...valid, titular: "Ab" }).success).toBe(false);
    expect(paymentFormSchema.safeParse({ ...valid, titular: "Juan 123" }).success).toBe(false);
  });

  it("rechaza un medio de pago o plan de cuotas fuera de los ofrecidos", () => {
    expect(paymentFormSchema.safeParse({ ...valid, medioPago: "CASH" }).success).toBe(false);
    expect(paymentFormSchema.safeParse({ ...valid, cuotas: 2 }).success).toBe(false);
  });
});

describe("installmentAmount (US-20)", () => {
  it("reparte el total en partes iguales sin recargo", () => {
    expect(installmentAmount(135000, 1)).toBe(135000);
    expect(installmentAmount(135000, 3)).toBe(45000);
    expect(installmentAmount(135000, 6)).toBe(22500);
  });
});
