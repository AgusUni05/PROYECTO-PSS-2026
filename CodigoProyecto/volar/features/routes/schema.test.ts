import { describe, expect, it } from "vitest";
import { newId } from "@/lib/id";
import { routeFiltersSchema, routeFormSchema } from "./schema";

const origin = newId("Airport");
const destination = newId("Airport");

const base = {
  originId: origin,
  destinationId: destination,
  operatingDays: ["MONDAY", "WEDNESDAY"] as const,
  departureTime: "08:30",
  arrivalTime: "10:00",
};

describe("routeFormSchema", () => {
  it("acepta datos válidos", () => {
    expect(routeFormSchema.safeParse(base).success).toBe(true);
  });

  it("rechaza cuando origen y destino son el mismo aeropuerto", () => {
    const result = routeFormSchema.safeParse({ ...base, destinationId: origin });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.destinationId).toBeDefined();
    }
  });

  it("rechaza sin días de operación", () => {
    expect(routeFormSchema.safeParse({ ...base, operatingDays: [] }).success).toBe(false);
  });

  it("rechaza un horario con formato inválido", () => {
    expect(routeFormSchema.safeParse({ ...base, departureTime: "25:00" }).success).toBe(false);
  });

  it("rechaza cuando llegada y partida son el mismo horario", () => {
    const result = routeFormSchema.safeParse({ ...base, arrivalTime: base.departureTime });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.arrivalTime).toBeDefined();
    }
  });
});

describe("routeFiltersSchema", () => {
  it("usa valores por defecto", () => {
    expect(routeFiltersSchema.parse({})).toEqual({
      origen: "",
      destino: "",
      estado: "activos",
      page: 1,
    });
  });
});
