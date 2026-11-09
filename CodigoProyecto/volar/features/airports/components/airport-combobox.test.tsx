import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { AirportCombobox } from "./airport-combobox";

const airports = [
  { id: "AER_EZE", code: "EZE", name: "Ministro Pistarini", city: "Buenos Aires" },
  { id: "AER_COR", code: "COR", name: "Ing. Ambrosio Taravella", city: "Córdoba" },
];

function render(props: Partial<Parameters<typeof AirportCombobox>[0]> = {}) {
  return renderToString(
    <AirportCombobox
      id="originId"
      airports={airports}
      value=""
      excludedId=""
      onChange={vi.fn()}
      placeholder="Buscá por código, aeropuerto o ciudad"
      {...props}
    />,
  );
}

describe("AirportCombobox (US-40)", () => {
  it("es un campo de texto asociable a su label, con el placeholder de búsqueda", () => {
    const html = render();

    expect(html).toContain('id="originId"');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('placeholder="Buscá por código, aeropuerto o ciudad"');
  });

  it("al editar, arranca completado con el aeropuerto elegido", () => {
    const html = render({ value: "AER_COR" });

    expect(html).toContain('value="COR — Ing. Ambrosio Taravella · Córdoba"');
  });

  it("marca el campo como inválido cuando el formulario tiene error", () => {
    expect(render({ invalid: true })).toContain('aria-invalid="true"');
  });

  it("ofrece un botón para desplegar las sugerencias", () => {
    expect(render()).toContain('aria-label="Ver aeropuertos"');
  });
});
