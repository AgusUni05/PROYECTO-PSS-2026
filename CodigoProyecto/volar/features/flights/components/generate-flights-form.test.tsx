import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GenerateFlightsForm } from "./generate-flights-form";

describe("GenerateFlightsForm", () => {
  it("presenta las tres secciones del flujo y las acciones del formulario", () => {
    const html = renderToString(<GenerateFlightsForm routes={[]} airplanes={[]} />);

    expect(html).toContain("Trayecto y período de disponibilidad");
    expect(html).toContain("Aeronave y capacidad por clase");
    expect(html).toContain("Tarifas por clase");
    expect(html).toContain("Restablecer Formulario");
    expect(html).toContain("Generar y Publicar Vuelos Reales");
  });
});
