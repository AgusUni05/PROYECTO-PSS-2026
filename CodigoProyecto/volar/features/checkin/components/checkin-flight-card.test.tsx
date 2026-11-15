import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../actions", () => ({ checkInAction: vi.fn() }));

import type { CheckinFlightGroup, CheckinPassenger } from "../queries";
import { CheckinFlightCard } from "./checkin-flight-card";

function passenger(overrides: Partial<CheckinPassenger> = {}): CheckinPassenger {
  return {
    id: "PAS_1",
    firstName: "Maria",
    lastName: "Demo",
    documentType: "DNI",
    documentNumber: "30000001",
    seat: "1A",
    seatClass: "ECONOMY",
    number: "ETK-DEMO0001-1",
    checkedInAt: null,
    ...overrides,
  };
}

function group(overrides: Partial<CheckinFlightGroup> = {}): CheckinFlightGroup {
  return {
    flight: {
      id: "VUE_1",
      code: "VU-20261120-002",
      date: new Date("2026-11-20T00:00:00.000Z"),
      departureAt: new Date("2026-11-20T10:00:00.000Z"),
      origin: { code: "EZE", city: "Buenos Aires" },
      destination: { code: "MDZ", city: "Mendoza" },
    },
    state: "open",
    opensAt: new Date("2026-11-19T10:00:00.000Z"),
    boardingAt: new Date("2026-11-20T09:20:00.000Z"),
    passengers: [passenger(), passenger({ id: "PAS_2", firstName: "Juan", seat: "1B" })],
    ...overrides,
  };
}

const render = (g: CheckinFlightGroup) => renderToString(<CheckinFlightCard code="DEMO0001" group={g} />);

describe("CheckinFlightCard (US-38)", () => {
  it("muestra el vuelo, la ruta, la salida y la hora de embarque", () => {
    const html = render(group());

    expect(html).toContain("VU-20261120-002");
    expect(html).toContain("EZE");
    expect(html).toContain("MDZ");
    expect(html).toContain("10:00");
    expect(html).toContain("09:20");
  });

  it("con la ventana abierta ofrece elegir pasajeros, la declaración y confirmar", () => {
    const html = render(group());

    expect(html.match(/type="checkbox"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain("Demo, Maria");
    expect(html).toContain("Demo, Juan");
    expect(html).toContain("mercancías peligrosas");
    expect(html).toContain("Confirmar check-in");
  });

  it("es el paso 2 y permite volver a elegir los asientos (US-37)", () => {
    const html = render(group());

    expect(html).toContain("Paso 2 de 2");
    expect(html).toContain('href="/compra/checkin/asientos?reserva=DEMO0001"');
    expect(html).toContain("Cambiar asientos");
  });

  it("si todos ya hicieron el check-in no ofrece cambiar asientos (US-37)", () => {
    const html = render(group({ passengers: [passenger({ checkedInAt: new Date("2026-11-19T20:00:00.000Z") })] }));

    expect(html).not.toContain("Cambiar asientos");
  });

  it("un pasajero que ya hizo el check-in figura como hecho y no se puede volver a elegir", () => {
    const html = render(
      group({
        passengers: [
          passenger({ checkedInAt: new Date("2026-11-19T20:00:00.000Z") }),
          passenger({ id: "PAS_2", firstName: "Juan" }),
        ],
      }),
    );

    expect(html).toContain("Check-in hecho");
    expect(html).toContain("Confirmar check-in");
  });

  it("si todos ya hicieron el check-in no muestra el formulario", () => {
    const done = new Date("2026-11-19T20:00:00.000Z");
    const html = render(group({ passengers: [passenger({ checkedInAt: done })] }));

    expect(html).toContain("Todos los pasajeros de este vuelo ya hicieron el check-in.");
    expect(html).not.toContain("Confirmar check-in");
  });

  it("antes de la ventana avisa cuándo se habilita", () => {
    const html = render(group({ state: "not-open" }));

    expect(html).toContain("El check-in se habilita el 19/11/2026 a las 10:00 hs.");
    expect(html).not.toContain("Confirmar check-in");
  });

  it("después del embarque avisa que cerró", () => {
    const html = render(group({ state: "closed" }));

    expect(html).toContain("El check-in de este vuelo cerró a las 09:20 hs.");
    expect(html).not.toContain("Confirmar check-in");
  });

  it("con el vuelo cancelado o ya salido no ofrece el check-in", () => {
    const html = render(group({ state: "unavailable" }));

    expect(html).toContain("Este vuelo no está programado");
    expect(html).not.toContain("Confirmar check-in");
  });
});
