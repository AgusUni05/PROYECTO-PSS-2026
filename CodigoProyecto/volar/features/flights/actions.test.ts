import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("./service", () => ({
  generateFlights: vi.fn(),
  updateFlight: vi.fn(),
  cancelFlight: vi.fn(),
  cancelFlightsByRoute: vi.fn(),
}));

vi.mock("@/lib/mailer/dispatch", () => ({
  dispatchPendingContingencyEmails: vi.fn(),
}));

import { requireAdmin } from "@/lib/auth";
import { newId } from "@/lib/id";
import { dispatchPendingContingencyEmails } from "@/lib/mailer/dispatch";
import * as flightsService from "./service";
import {
  cancelFlightAction,
  cancelRouteFlightsAction,
  updateFlightAction,
} from "./actions";

const admin = { id: newId("User") };
const flightId = newId("Flight");

const updateValues = {
  economyCapacity: 100,
  firstClassCapacity: 10,
  economyFare: 50000,
  firstClassFare: 90000,
};

describe("flights admin actions — US-25 outbox dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(admin as never);
    vi.mocked(dispatchPendingContingencyEmails).mockResolvedValue({
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    });
    vi.stubEnv("APP_URL", "https://volar.example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("envía el outbox de contingencias cuando un cambio de horario se guarda", async () => {
    vi.mocked(flightsService.updateFlight).mockResolvedValue({
      ok: true,
      data: { id: flightId },
    });

    const result = await updateFlightAction(flightId, updateValues);

    expect(result.ok).toBe(true);
    expect(dispatchPendingContingencyEmails).toHaveBeenCalledWith(
      "https://volar.example.com",
    );
  });

  it("no intenta enviar si la edición del vuelo falla", async () => {
    vi.mocked(flightsService.updateFlight).mockResolvedValue({
      ok: false,
      error: "Vuelo inválido",
    });

    const result = await updateFlightAction(flightId, updateValues);

    expect(result.ok).toBe(false);
    expect(dispatchPendingContingencyEmails).not.toHaveBeenCalled();
  });

  it("envía el outbox al cancelar un vuelo", async () => {
    vi.mocked(flightsService.cancelFlight).mockResolvedValue({
      ok: true,
      data: { id: flightId, affectedTickets: 2 },
    });

    const result = await cancelFlightAction(flightId, { reason: "operativo" });

    expect(result.ok).toBe(true);
    expect(dispatchPendingContingencyEmails).toHaveBeenCalledWith(
      "https://volar.example.com",
    );
  });

  it("envía el outbox al cancelar todos los vuelos de una ruta", async () => {
    const routeId = newId("Route");
    vi.mocked(flightsService.cancelFlightsByRoute).mockResolvedValue({
      ok: true,
      data: { cancelled: 3, affectedTickets: 5 },
    });

    const result = await cancelRouteFlightsAction({
      routeId,
      reason: "meteorologico",
    });

    expect(result.ok).toBe(true);
    expect(dispatchPendingContingencyEmails).toHaveBeenCalledWith(
      "https://volar.example.com",
    );
  });

  it("usa el fallback local si APP_URL está vacío", async () => {
    vi.stubEnv("APP_URL", "");
    vi.mocked(flightsService.updateFlight).mockResolvedValue({
      ok: true,
      data: { id: flightId },
    });

    await updateFlightAction(flightId, updateValues);

    expect(dispatchPendingContingencyEmails).toHaveBeenCalledWith(
      "http://localhost:3000",
    );
  });

  it("no rompe la operación administrativa si falla el envío de emails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(flightsService.updateFlight).mockResolvedValue({
      ok: true,
      data: { id: flightId },
    });
    vi.mocked(dispatchPendingContingencyEmails).mockRejectedValue(
      new Error("SMTP no disponible"),
    );

    const result = await updateFlightAction(flightId, updateValues);

    expect(result).toEqual({ ok: true, data: { id: flightId } });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
