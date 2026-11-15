import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("../actions", () => ({ chooseSeatsAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { cabinSection } from "../cabin";
import { SeatMap } from "./seat-map";

// 9 asientos de Economy: filas 1 y 2, la última incompleta (2A a 2C).
const CABIN = { economyCapacity: 9, firstClassCapacity: 6 };

function render(overrides: Partial<Parameters<typeof SeatMap>[0]> = {}) {
  return renderToString(
    <SeatMap
      code="DEMO0001"
      flightId="VUE_1"
      section={cabinSection(CABIN, "ECONOMY")}
      otherClass="FIRST"
      occupied={["1B"]}
      passengers={[
        { id: "PAS_1", name: "Demo, Maria", seat: "1A" },
        { id: "PAS_2", name: "Demo, Juan", seat: "1C" },
      ]}
      {...overrides}
    />,
  );
}

describe("SeatMap (US-37)", () => {
  const html = render();

  it("lista los pasajeros con su asiento, con el primero elegido", () => {
    expect(html).toContain("1. Demo, Maria");
    expect(html).toContain("Asiento 1A");
    expect(html).toContain("2. Demo, Juan");
    expect(html).toMatch(/aria-pressed="true"[^>]*>.*1\. Demo, Maria/);
  });

  it("muestra los asientos de la clase comprada y bloquea la otra", () => {
    expect(html).toContain('aria-label="Cabina Economy"');
    expect(html).toContain('aria-label="Asiento 1A, de Demo, Maria"');
    expect(html).toContain('aria-label="Asiento 1C, de Demo, Juan"');
    expect(html).toContain('aria-label="Asiento 2C, libre"');
    expect(html).toContain("Primera Clase: no disponible para un pasaje Economy.");
  });

  it("los asientos ocupados no se pueden elegir", () => {
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Asiento 1B, ocupado"/);
  });

  it("la última fila incompleta no inventa asientos", () => {
    expect(html).toContain("Asiento 2C");
    expect(html).not.toContain("Asiento 2D");
  });

  it("ofrece confirmar y continuar al check-in", () => {
    expect(html).toContain("Confirmar asientos y continuar al check-in");
  });

  it("sin la otra clase en el vuelo no muestra el aviso de bloqueo", () => {
    expect(render({ otherClass: null })).not.toContain("no disponible para un pasaje");
  });
});
