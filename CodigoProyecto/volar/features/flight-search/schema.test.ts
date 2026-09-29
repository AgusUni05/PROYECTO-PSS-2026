import { describe, expect, it } from "vitest";
import { newId } from "@/lib/id";
import { flightSearchSchema } from "./schema";

function isoDaysFromToday(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const base = {
  origen: newId("Airport"),
  destino: newId("Airport"),
  fecha: isoDaysFromToday(1),
};

function fieldErrors(values: Record<string, unknown>) {
  const result = flightSearchSchema.safeParse(values);
  return result.success ? {} : result.error.flatten().fieldErrors;
}

describe("flightSearchSchema (US-13)", () => {
  it("acepta una búsqueda válida", () => {
    expect(flightSearchSchema.safeParse(base).success).toBe(true);
  });

  it("acepta la fecha de hoy", () => {
    expect(flightSearchSchema.safeParse({ ...base, fecha: isoDaysFromToday(0) }).success).toBe(true);
  });

  it("rechaza origen y destino iguales", () => {
    expect(fieldErrors({ ...base, destino: base.origen }).destino).toBeDefined();
  });

  it("exige origen, destino y fecha, con mensajes para el pasajero", () => {
    const errors = fieldErrors({ origen: "", destino: "", fecha: "" });
    expect(errors.origen).toEqual(["Seleccioná el origen"]);
    expect(errors.destino).toEqual(["Seleccioná el destino"]);
    expect(errors.fecha).toEqual(["Elegí la fecha de salida"]);
  });

  it("rechaza parámetros ausentes (URL sin datos)", () => {
    expect(flightSearchSchema.safeParse({}).success).toBe(false);
  });

  it("rechaza ids que no son de aeropuerto", () => {
    expect(fieldErrors({ ...base, origen: newId("Route") }).origen).toBeDefined();
  });

  it("rechaza fechas pasadas", () => {
    expect(fieldErrors({ ...base, fecha: isoDaysFromToday(-1) }).fecha).toBeDefined();
  });

  it("rechaza fechas con formato inválido", () => {
    expect(fieldErrors({ ...base, fecha: "02/10/2026" }).fecha).toBeDefined();
  });
});
