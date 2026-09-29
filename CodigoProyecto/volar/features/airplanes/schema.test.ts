import { describe, expect, it } from "vitest";
import { airplaneFiltersSchema, airplaneFormSchema } from "./schema";

const base = { identifier: "lv-arg01", model: "Boeing 737-800", economySeats: 150, firstClassSeats: 16 };

describe("airplaneFormSchema", () => {
  it("normaliza el identificador a mayúsculas", () => {
    const result = airplaneFormSchema.parse(base);
    expect(result.identifier).toBe("LV-ARG01");
  });

  it("rechaza cantidades negativas", () => {
    expect(
      airplaneFormSchema.safeParse({ ...base, economySeats: -1 }).success,
    ).toBe(false);
  });

  it("rechaza cantidades no enteras", () => {
    expect(
      airplaneFormSchema.safeParse({ ...base, economySeats: 10.5 }).success,
    ).toBe(false);
  });

  it("rechaza cuando ambas clases tienen 0 asientos", () => {
    const result = airplaneFormSchema.safeParse({
      ...base,
      economySeats: 0,
      firstClassSeats: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.economySeats).toBeDefined();
    }
  });

  it("acepta cuando solo una clase tiene asientos", () => {
    expect(
      airplaneFormSchema.safeParse({ ...base, economySeats: 100, firstClassSeats: 0 }).success,
    ).toBe(true);
  });

  it("exige un identificador", () => {
    expect(airplaneFormSchema.safeParse({ ...base, identifier: "" }).success).toBe(false);
  });
});

describe("airplaneFiltersSchema", () => {
  it("usa valores por defecto", () => {
    expect(airplaneFiltersSchema.parse({})).toEqual({
      q: "",
      estado: "activos",
      config: "todas",
      page: 1,
    });
  });

  it("cae a los valores por defecto ante un config inválido", () => {
    expect(airplaneFiltersSchema.parse({ config: "otra-cosa" }).config).toBe("todas");
  });
});
