import { describe, expect, it } from "vitest";
import {
  auditChanges,
  formatAuditTimestamp,
  formatAuditValue,
  type FlightAuditSnapshot,
} from "./audit";

const snapshot: FlightAuditSnapshot = {
  departureAt: new Date("2026-10-01T08:30:00.000Z"),
  arrivalAt: new Date("2026-10-01T10:00:00.000Z"),
  airplane: "LV-ARG01",
  economyCapacity: 150,
  firstClassCapacity: 16,
  economyFare: 45000,
  firstClassFare: 95000,
  status: "SCHEDULED",
};

describe("auditChanges (US-43)", () => {
  it("en una creación lista todos los valores iniciales sin valor anterior", () => {
    const changes = auditChanges(null, snapshot);

    expect(changes).toHaveLength(8);
    expect(changes.every((c) => c.from === null)).toBe(true);
    expect(changes).toContainEqual({
      field: "departureAt",
      from: null,
      to: "2026-10-01T08:30:00.000Z",
    });
  });

  it("devuelve solo los campos que cambiaron", () => {
    const changes = auditChanges(snapshot, {
      ...snapshot,
      arrivalAt: new Date("2026-10-01T10:30:00.000Z"),
      firstClassCapacity: 12,
    });

    expect(changes).toEqual([
      { field: "arrivalAt", from: "2026-10-01T10:00:00.000Z", to: "2026-10-01T10:30:00.000Z" },
      { field: "firstClassCapacity", from: 16, to: 12 },
    ]);
  });

  it("no devuelve cambios si los valores son iguales (fechas como instantes distintos)", () => {
    expect(
      auditChanges(snapshot, { ...snapshot, departureAt: new Date(snapshot.departureAt) }),
    ).toEqual([]);
  });
});

describe("formatAuditValue (US-43)", () => {
  it("formatea cada tipo de campo como el resto del panel", () => {
    expect(formatAuditValue("departureAt", "2026-10-01T08:30:00.000Z")).toBe("01/10/2026 08:30");
    expect(formatAuditValue("economyFare", 45000)).toBe(formatAuditValue("firstClassFare", "45000"));
    expect(formatAuditValue("economyFare", 45000)).toMatch(/45\.000/);
    expect(formatAuditValue("status", "CANCELLED")).toBe("Cancelado");
    expect(formatAuditValue("airplane", "LV-ARG01")).toBe("LV-ARG01");
    expect(formatAuditValue("economyCapacity", 150)).toBe("150");
  });

  it("muestra un guion cuando no hay valor anterior", () => {
    expect(formatAuditValue("airplane", null)).toBe("—");
  });
});

describe("formatAuditTimestamp (US-43)", () => {
  it("muestra el instante en hora argentina (UTC-3) con segundos", () => {
    expect(formatAuditTimestamp(new Date("2026-11-09T17:05:32.000Z"))).toMatch(
      /09\/11\/2026,? 14:05:32/,
    );
  });
});
