import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GenerateFlightsForm } from "./generate-flights-form";
import { totalCapacityLabel } from "./generate-flights-form.utils";

describe("GenerateFlightsForm", () => {
  it("presenta las tres secciones del flujo y las acciones del formulario", () => {
    const html = renderToString(<GenerateFlightsForm routes={[]} airplanes={[]} />);

    expect(html).toContain("Trayecto y período de disponibilidad");
    expect(html).toContain("Aeronave y capacidad por clase");
    expect(html).toContain("Tarifas por clase");
    expect(html).toContain("Restablecer Formulario");
    expect(html).toContain("Generar y Publicar Vuelos Reales");
  });

  it("muestra la capacidad total de la aeronave (US-40)", () => {
    const html = renderToString(<GenerateFlightsForm routes={[]} airplanes={[]} />);

    expect(html).toContain("Capacidad total");
    expect(html).toContain("0 asientos");
  });
});

describe("totalCapacityLabel (US-40)", () => {
  it("suma los asientos de Economy y Primera", () => {
    expect(totalCapacityLabel(150, 16)).toBe("166 asientos");
    expect(totalCapacityLabel(1, 0)).toBe("1 asiento");
  });

  it("muestra un guion si alguna capacidad está vacía", () => {
    expect(totalCapacityLabel(Number.NaN, 16)).toBe("—");
    expect(totalCapacityLabel(150, Number.NaN)).toBe("—");
  });
});
