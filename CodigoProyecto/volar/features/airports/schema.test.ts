import { describe, expect, it } from "vitest";
import { airportFiltersSchema, airportFormSchema } from "./schema";

describe("airportFormSchema", () => {
  it("normaliza el código a mayúsculas", () => {
    const result = airportFormSchema.parse({ code: "eze", name: "Ezeiza", city: "Buenos Aires" });
    expect(result.code).toBe("EZE");
  });

  it("acepta códigos IATA (3) e ICAO (4)", () => {
    expect(
      airportFormSchema.safeParse({ code: "EZE", name: "Ezeiza", city: "Buenos Aires" }).success,
    ).toBe(true);
    expect(
      airportFormSchema.safeParse({ code: "SAEZ", name: "Ezeiza", city: "Buenos Aires" }).success,
    ).toBe(true);
  });

  it("rechaza códigos de 2 o 5 caracteres", () => {
    expect(
      airportFormSchema.safeParse({ code: "EZ", name: "Ezeiza", city: "Buenos Aires" }).success,
    ).toBe(false);
    expect(
      airportFormSchema.safeParse({ code: "SAEZZ", name: "Ezeiza", city: "Buenos Aires" })
        .success,
    ).toBe(false);
  });

  it("rechaza códigos con números o símbolos", () => {
    expect(
      airportFormSchema.safeParse({ code: "EZ1", name: "Ezeiza", city: "Buenos Aires" }).success,
    ).toBe(false);
  });

  it("exige nombre y ciudad", () => {
    const result = airportFormSchema.safeParse({ code: "EZE", name: "", city: "" });
    expect(result.success).toBe(false);
  });
});

describe("airportFiltersSchema", () => {
  it("usa valores por defecto cuando no se pasa nada", () => {
    const result = airportFiltersSchema.parse({});
    expect(result).toEqual({ q: "", estado: "activos", page: 1 });
  });

  it("cae a los valores por defecto ante entradas inválidas", () => {
    const result = airportFiltersSchema.parse({ estado: "cualquier-cosa", page: "no-es-numero" });
    expect(result.estado).toBe("activos");
    expect(result.page).toBe(1);
  });
});
