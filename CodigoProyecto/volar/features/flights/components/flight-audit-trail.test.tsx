import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { FlightAuditTrail } from "./flight-audit-trail";
import type { FlightAuditTrail as FlightAuditTrailData } from "../queries";

const baseTrail: FlightAuditTrailData = {
  code: "VU-20261001-001",
  date: new Date("2026-10-01T00:00:00.000Z"),
  originCode: "AEP",
  destinationCode: "COR",
  status: "CANCELLED",
  createdAt: new Date("2026-09-01T15:00:00.000Z"),
  createdByName: "Ana Admin",
  events: [],
};

function render(trail: FlightAuditTrailData) {
  return renderToString(<FlightAuditTrail trail={trail} />).replaceAll("<!-- -->", "");
}

describe("FlightAuditTrail (US-43)", () => {
  it("muestra quién creó el vuelo y un aviso si no hay eventos", () => {
    const html = render(baseTrail);

    expect(html).toContain("Ana Admin");
    expect(html).toContain("01/09/2026");
    expect(html).toContain("Sin eventos registrados");
  });

  it("muestra usuario, fecha y hora, valores anteriores y nuevos, y el motivo", () => {
    const html = render({
      ...baseTrail,
      events: [
        {
          id: "AUD_1",
          action: "UPDATED",
          changes: [{ field: "economyFare", from: 45000, to: 50000 }],
          reason: null,
          createdAt: new Date("2026-09-10T13:20:05.000Z"),
          userName: "Beto Editor",
          userEmail: "beto@volar.test",
        },
        {
          id: "AUD_2",
          action: "CANCELLED",
          changes: [{ field: "status", from: "SCHEDULED", to: "CANCELLED" }],
          reason: "Condiciones meteorológicas adversas",
          createdAt: new Date("2026-09-12T13:00:00.000Z"),
          userName: "Ana Admin",
          userEmail: "ana@volar.test",
        },
      ],
    });

    expect(html).toContain("Historial de cambios (2)");
    expect(html).toContain("10:20:05");
    expect(html).toContain("Beto Editor");
    expect(html).toContain("beto@volar.test");
    expect(html).toContain("Modificación");
    expect(html).toContain("Tarifa Economy");
    expect(html).toMatch(/45\.000/);
    expect(html).toMatch(/50\.000/);
    expect(html).toContain("Cancelación");
    expect(html).toContain("Programado");
    expect(html).toContain("Cancelado");
    expect(html).toContain("Condiciones meteorológicas adversas");
    expect(html).not.toContain("Sin eventos registrados");
  });
});
