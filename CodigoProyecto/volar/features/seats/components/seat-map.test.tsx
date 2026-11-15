import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("../actions", () => ({ chooseSeatsAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { cabinSection } from "../cabin";
import { SeatMap } from "./seat-map";

// 6 asientos de Primera (filas 1 y 2) y 9 de Economy (filas 3 y 4, la última incompleta).
const CABIN = { economyCapacity: 9, firstClassCapacity: 6 };

function render(overrides: Partial<Parameters<typeof SeatMap>[0]> = {}) {
  return renderToString(
    <SeatMap
      code="DEMO0001"
      flightId="VUE_1"
      section={cabinSection(CABIN, "ECONOMY")}
      otherRows={{ seatClass: "FIRST", from: 1, to: 2 }}
      occupied={["3B"]}
      passengers={[
        { id: "PAS_1", name: "Demo, Maria", seat: "3A" },
        { id: "PAS_2", name: "Demo, Juan", seat: "3C" },
      ]}
      {...overrides}
    />,
  );
}

describe("SeatMap (US-37)", () => {
  const html = render();

  it("lista los pasajeros con su asiento, con el primero elegido", () => {
    expect(html).toContain("1. Demo, Maria");
    expect(html).toContain("Asiento 3A");
    expect(html).toContain("2. Demo, Juan");
    expect(html).toMatch(/aria-pressed="true"[^>]*>.*1\. Demo, Maria/);
  });

  it("muestra solo las filas de la clase comprada y bloquea la otra", () => {
    expect(html).toContain('aria-label="Asiento 3A, de Demo, Maria"');
    expect(html).toContain('aria-label="Asiento 4C, libre"');
    expect(html).not.toContain("Asiento 1A");
    expect(html).toContain("Primera Clase (filas 1 a 2): no disponible para un pasaje Economy.");
  });

  it("los asientos ocupados por otros no se pueden elegir", () => {
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Asiento 3B, ocupado"/);
  });

  it("la última fila incompleta no inventa asientos", () => {
    expect(html).toContain("Asiento 4C");
    expect(html).not.toContain("Asiento 4D");
  });

  it("ofrece confirmar y continuar al check-in", () => {
    expect(html).toContain("Confirmar asientos y continuar al check-in");
  });

  it("sin la otra clase en el vuelo no muestra el aviso de bloqueo", () => {
    expect(render({ otherRows: null })).not.toContain("no disponible para un pasaje");
  });
});
