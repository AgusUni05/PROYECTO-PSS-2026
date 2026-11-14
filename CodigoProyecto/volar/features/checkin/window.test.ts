import { describe, expect, it } from "vitest";
import { boardingTime, checkinOpensAt, checkinWindowState } from "./window";

const DEPARTURE = new Date("2026-11-20T08:30:00.000Z");
const at = (iso: string) => new Date(iso);

describe("ventana de check-in (US-38)", () => {
  it("abre 24 horas antes de la salida", () => {
    expect(checkinOpensAt(DEPARTURE)).toEqual(at("2026-11-19T08:30:00.000Z"));
  });

  it("el embarque es 40 minutos antes de la salida", () => {
    expect(boardingTime(DEPARTURE)).toEqual(at("2026-11-20T07:50:00.000Z"));
  });

  it("antes de las 24 horas previas todavía no está abierta", () => {
    expect(checkinWindowState(DEPARTURE, at("2026-11-18T12:00:00.000Z"))).toBe("not-open");
    expect(checkinWindowState(DEPARTURE, at("2026-11-19T08:29:59.999Z"))).toBe("not-open");
  });

  it("está abierta desde las 24 horas previas (inclusive) hasta el embarque", () => {
    expect(checkinWindowState(DEPARTURE, at("2026-11-19T08:30:00.000Z"))).toBe("open");
    expect(checkinWindowState(DEPARTURE, at("2026-11-20T07:49:59.999Z"))).toBe("open");
  });

  it("cierra a la hora de embarque y queda cerrada después de la salida", () => {
    expect(checkinWindowState(DEPARTURE, at("2026-11-20T07:50:00.000Z"))).toBe("closed");
    expect(checkinWindowState(DEPARTURE, at("2026-11-20T10:00:00.000Z"))).toBe("closed");
  });
});
