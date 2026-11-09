import { describe, expect, it } from "vitest";
import { airportLabel, airportMatches, selectableAirports } from "./airport-search";

const EZE = { id: "AER_EZE", code: "EZE", name: "Ministro Pistarini", city: "Buenos Aires" };
const COR = { id: "AER_COR", code: "COR", name: "Ing. Ambrosio Taravella", city: "Córdoba" };
const MDZ = { id: "AER_MDZ", code: "MDZ", name: "El Plumerillo", city: "Mendoza" };

describe("airportMatches (US-40)", () => {
  it("encuentra por código IATA sin importar mayúsculas", () => {
    expect(airportMatches(EZE, "eze")).toBe(true);
    expect(airportMatches(EZE, "EZ")).toBe(true);
  });

  it("encuentra por ciudad o por nombre del aeropuerto", () => {
    expect(airportMatches(EZE, "buenos")).toBe(true);
    expect(airportMatches(EZE, "pistarini")).toBe(true);
  });

  it("ignora las tildes en la búsqueda y en el catálogo", () => {
    expect(airportMatches(COR, "cordoba")).toBe(true);
    expect(airportMatches(COR, "CÓRDOBA")).toBe(true);
  });

  it("no encuentra un aeropuerto que no coincide", () => {
    expect(airportMatches(MDZ, "cordoba")).toBe(false);
  });

  it("con la búsqueda vacía o con espacios muestra todos", () => {
    expect(airportMatches(MDZ, "")).toBe(true);
    expect(airportMatches(MDZ, "   ")).toBe(true);
  });
});

describe("airportLabel (US-40)", () => {
  it("muestra código, nombre y ciudad", () => {
    expect(airportLabel(COR)).toBe("COR — Ing. Ambrosio Taravella · Córdoba");
  });
});

describe("selectableAirports (US-40)", () => {
  it("oculta el aeropuerto elegido en el otro extremo del trayecto", () => {
    expect(selectableAirports([EZE, COR, MDZ], "AER_COR").map((a) => a.code)).toEqual(["EZE", "MDZ"]);
  });

  it("sin aeropuerto elegido del otro lado, ofrece todos", () => {
    expect(selectableAirports([EZE, COR, MDZ], "").map((a) => a.code)).toEqual(["EZE", "COR", "MDZ"]);
  });
});
