import { describe, expect, it } from "vitest";
import { newId } from "@/lib/id";
import {
  confirmPurchaseSchema,
  passengerSchema,
  passengersFormSchema,
  purchaseSelectionSchema,
} from "./schema";
import {
  formatCardNumber,
  formatCvv,
  formatExpiry,
  installmentAmount,
  paymentFormSchema,
} from "./schema";

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

describe("máscaras de pago (US-20)", () => {
  it("agrupa el número de tarjeta de a 4 y descarta lo que no sea dígito", () => {
    expect(formatCardNumber("4517882099124242")).toBe("4517 8820 9912 4242");
    expect(formatCardNumber("4517 8820-9912 4242")).toBe("4517 8820 9912 4242");
    expect(formatCardNumber("4517abc8820")).toBe("4517 8820");
    expect(formatCardNumber("4517882099124242999")).toBe("4517 8820 9912 4242");
  });

  it("inserta la barra del vencimiento MM/AA", () => {
    expect(formatExpiry("1229")).toBe("12/29");
    expect(formatExpiry("12")).toBe("12");
    expect(formatExpiry("1")).toBe("1");
    expect(formatExpiry("12/29")).toBe("12/29");
    expect(formatExpiry("12a29")).toBe("12/29");
    expect(formatExpiry("12299")).toBe("12/29");
  });

  it("deja el CVV solo con dígitos (hasta 4)", () => {
    expect(formatCvv("12a3")).toBe("123");
    expect(formatCvv("12345")).toBe("1234");
  });
});

describe("passengerSchema / passengersFormSchema (US-18/US-19)", () => {
  const valid = {
    nombre: "Juan Carlos",
    apellido: "Pérez",
    tipoDocumento: "DNI" as const,
    numeroDocumento: "32456789",
  };

  function issuesOf(value: unknown) {
    const result = passengersFormSchema.safeParse(value);
    return result.success ? [] : result.error.issues.map((i) => [i.path.join("."), i.message]);
  }

  it("acepta un pasajero con DNI o pasaporte válido y normaliza el documento", () => {
    expect(passengerSchema.safeParse(valid).success).toBe(true);
    const passport = passengerSchema.safeParse({
      ...valid,
      tipoDocumento: "PASSPORT",
      numeroDocumento: " aaa123456 ",
    });
    expect(passport.success && passport.data.numeroDocumento).toBe("AAA123456");
  });

  it("exige nombre, apellido y número de documento", () => {
    const issues = issuesOf({
      pasajeros: [{ nombre: "", apellido: "  ", tipoDocumento: "DNI", numeroDocumento: "" }],
    });
    expect(issues).toContainEqual(["pasajeros.0.nombre", "Ingresá el nombre"]);
    expect(issues).toContainEqual(["pasajeros.0.apellido", "Ingresá el apellido"]);
    expect(issues).toContainEqual(["pasajeros.0.numeroDocumento", "Ingresá el número de documento"]);
  });

  it("rechaza nombres con números o símbolos", () => {
    expect(passengerSchema.safeParse({ ...valid, nombre: "Juan3" }).success).toBe(false);
    expect(passengerSchema.safeParse({ ...valid, apellido: "Pérez!" }).success).toBe(false);
  });

  it("valida el formato del documento según el tipo y marca al pasajero exacto", () => {
    const issues = issuesOf({
      pasajeros: [valid, { ...valid, numeroDocumento: "32.456.780" }],
    });
    expect(issues).toEqual([
      ["pasajeros.1.numeroDocumento", "El DNI debe tener 7 u 8 dígitos, sin puntos ni letras"],
    ]);
    expect(
      passengerSchema.safeParse({ ...valid, tipoDocumento: "PASSPORT", numeroDocumento: "AB-12" })
        .success,
    ).toBe(false);
  });

  it("marca todos los errores a la vez, aunque haya varios campos inválidos", () => {
    const issues = issuesOf({
      pasajeros: [{ ...valid, nombre: "", numeroDocumento: "abc" }],
    });
    expect(issues.map(([path]) => path)).toEqual(
      expect.arrayContaining(["pasajeros.0.nombre", "pasajeros.0.numeroDocumento"]),
    );
  });

  it("rechaza el mismo documento repetido en dos pasajeros", () => {
    const issues = issuesOf({
      pasajeros: [valid, { ...valid, nombre: "Ana" }],
    });
    expect(issues).toEqual([
      ["pasajeros.1.numeroDocumento", "Este documento ya está cargado en el Pasajero 1"],
    ]);
  });

  it("acepta de 1 a 9 pasajeros", () => {
    const docs = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ ...valid, numeroDocumento: String(30000000 + i) }));
    expect(passengersFormSchema.safeParse({ pasajeros: docs(9) }).success).toBe(true);
    expect(passengersFormSchema.safeParse({ pasajeros: docs(10) }).success).toBe(false);
    expect(passengersFormSchema.safeParse({ pasajeros: [] }).success).toBe(false);
  });
});
