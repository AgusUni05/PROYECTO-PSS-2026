import { describe, expect, it } from "vitest";
import { newId } from "@/lib/id";
import { flightFiltersSchema, generateFlightsFormSchema } from "./schema";

function isoDaysFromToday(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const today = isoDaysFromToday(0);
const yesterday = isoDaysFromToday(-1);
const tomorrow = isoDaysFromToday(1);
const in30Days = isoDaysFromToday(30);

const base = {
  routeId: newId("Route"),
  airplaneId: newId("Airplane"),
  startDate: tomorrow,
  endDate: in30Days,
  economyCapacity: 150,
  firstClassCapacity: 16,
  economyFare: 45000,
  firstClassFare: 95000,
};

describe("generateFlightsFormSchema", () => {
  it("acepta datos válidos", () => {
    expect(generateFlightsFormSchema.safeParse(base).success).toBe(true);
  });

  it("acepta cuando la fecha de inicio es hoy", () => {
    expect(
      generateFlightsFormSchema.safeParse({ ...base, startDate: today, endDate: today }).success,
    ).toBe(true);
  });

  it("rechaza cuando la fecha de inicio es anterior a hoy", () => {
    const result = generateFlightsFormSchema.safeParse({
      ...base,
      startDate: yesterday,
      endDate: in30Days,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.startDate).toBeDefined();
    }
  });

  it("rechaza cuando la fecha fin es anterior al inicio", () => {
    const result = generateFlightsFormSchema.safeParse({
      ...base,
      startDate: in30Days,
      endDate: tomorrow,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.endDate).toBeDefined();
    }
  });

  it("acepta cuando la fecha fin es igual al inicio", () => {
    expect(
      generateFlightsFormSchema.safeParse({ ...base, startDate: tomorrow, endDate: tomorrow })
        .success,
    ).toBe(true);
  });

  it("rechaza tarifas en 0 o negativas", () => {
    expect(generateFlightsFormSchema.safeParse({ ...base, economyFare: 0 }).success).toBe(false);
    expect(generateFlightsFormSchema.safeParse({ ...base, firstClassFare: -1 }).success).toBe(
      false,
    );
  });

  it("rechaza cuando ambas capacidades son 0", () => {
    const result = generateFlightsFormSchema.safeParse({
      ...base,
      economyCapacity: 0,
      firstClassCapacity: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.economyCapacity).toBeDefined();
    }
  });

  it("rechaza capacidades negativas", () => {
    expect(generateFlightsFormSchema.safeParse({ ...base, economyCapacity: -1 }).success).toBe(
      false,
    );
  });
});

describe("flightFiltersSchema", () => {
  it("usa valores por defecto", () => {
    expect(flightFiltersSchema.parse({})).toEqual({
      fecha: "",
      origen: "",
      destino: "",
      estado: "SCHEDULED",
      page: 1,
    });
  });

  it("cae a los valores por defecto ante un estado inválido", () => {
    expect(flightFiltersSchema.parse({ estado: "otra-cosa" }).estado).toBe("SCHEDULED");
  });
});
