import { describe, expect, it } from "vitest";
import { counterSaleSchema, reservationSearchSchema } from "./schema";

const validPassenger = {
  nombre: "Esteban",
  apellido: "Ríos",
  tipoDocumento: "DNI" as const,
  numeroDocumento: "29881234",
};

describe("counterSaleSchema (US-33)", () => {
  it("rechaza una venta sin email de contacto", () => {
    const result = counterSaleSchema.safeParse({
      flightId: "VUE_01JB8Z3K4M5N6P7Q8R9S0T1V2W",
      seatClass: "ECONOMY",
      metodoPago: "CASH",
      pasajeros: [validPassenger],
    });

    expect(result.success).toBe(false);
  });

  it("acepta un email de contacto válido", () => {
    const result = counterSaleSchema.safeParse({
      flightId: "VUE_01JB8Z3K4M5N6P7Q8R9S0T1V2W",
      seatClass: "ECONOMY",
      metodoPago: "POS",
      contactEmail: "pasajero@test.com",
      pasajeros: [validPassenger],
    });

    expect(result.success).toBe(true);
  });

  it("rechaza un email de contacto con formato inválido", () => {
    const result = counterSaleSchema.safeParse({
      flightId: "VUE_01JB8Z3K4M5N6P7Q8R9S0T1V2W",
      seatClass: "ECONOMY",
      metodoPago: "CASH",
      contactEmail: "no-es-un-email",
      pasajeros: [validPassenger],
    });

    expect(result.success).toBe(false);
  });

  it("rechaza más de 9 pasajeros", () => {
    const result = counterSaleSchema.safeParse({
      flightId: "VUE_01JB8Z3K4M5N6P7Q8R9S0T1V2W",
      seatClass: "ECONOMY",
      metodoPago: "CASH",
      contactEmail: "pasajero@test.com",
      pasajeros: Array.from({ length: 10 }, () => validPassenger),
    });

    expect(result.success).toBe(false);
  });

  it("rechaza cero pasajeros", () => {
    const result = counterSaleSchema.safeParse({
      flightId: "VUE_01JB8Z3K4M5N6P7Q8R9S0T1V2W",
      seatClass: "ECONOMY",
      metodoPago: "CASH",
      contactEmail: "pasajero@test.com",
      pasajeros: [],
    });

    expect(result.success).toBe(false);
  });
});

describe("reservationSearchSchema (US-34)", () => {
  it("acepta un criterio no vacío", () => {
    expect(reservationSearchSchema.safeParse({ criterio: "32456789" }).success).toBe(true);
  });

  it("rechaza un criterio vacío", () => {
    expect(reservationSearchSchema.safeParse({ criterio: "" }).success).toBe(false);
  });
});
