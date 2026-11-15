import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import type { CheckinFlightGroup, CheckinPassenger, CheckinView } from "@/features/checkin/queries";

vi.mock("@/features/checkin/queries", () => ({ getCheckinView: vi.fn() }));

import { getCheckinView } from "@/features/checkin/queries";
import { getSeatSelectionView } from "./queries";

const NOW = new Date("2026-11-20T00:00:00.000Z");

function passenger(overrides: Partial<CheckinPassenger> = {}): CheckinPassenger {
  return {
    id: "PAS_1",
    firstName: "Maria",
    lastName: "Demo",
    documentType: "DNI",
    documentNumber: "30000001",
    seat: "5A",
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
    passengers: [passenger()],
    ...overrides,
  };
}

function view(overrides: Partial<CheckinView> = {}): CheckinView {
  return { code: "DEMO0001", status: "CONFIRMED", groups: [group()], ...overrides };
}

beforeEach(() => {
  vi.mocked(getCheckinView).mockResolvedValue(view());
  prismaMock.flight.findMany.mockResolvedValue([
    { id: "VUE_1", economyCapacity: 12, firstClassCapacity: 6 },
  ] as never);
  prismaMock.ticket.findMany.mockResolvedValue([{ seat: "3B" }, { seat: "1A" }] as never);
});

describe("getSeatSelectionView (US-37)", () => {
  it("una reserva ajena o inexistente devuelve null", async () => {
    vi.mocked(getCheckinView).mockResolvedValue(null);

    expect(await getSeatSelectionView("DEMO0001", "USU_1", NOW)).toBeNull();
    expect(getCheckinView).toHaveBeenCalledWith("DEMO0001", "USU_1", NOW);
  });

  it("arma la cabina de la clase comprada, con la otra clase bloqueada y los ocupados de todo el vuelo", async () => {
    const result = await getSeatSelectionView("DEMO0001", "USU_1", NOW);
    const [flight] = result?.flights ?? [];

    // 12 asientos de Economy: filas 1 y 2 (cada clase arranca en la fila 1).
    expect(flight.seatClass).toBe("ECONOMY");
    expect(flight.section.rows.map((row) => row.number)).toEqual([1, 2]);
    expect(flight.otherClass).toBe("FIRST");
    // El asiento es único por vuelo: también cuentan los ocupados de la otra clase.
    expect(flight.occupied).toEqual(["3B", "1A"]);
    expect(flight.passengers).toEqual([{ id: "PAS_1", name: "Demo, Maria", seat: "5A" }]);
    // Los asientos de los pasajeros que eligen no cuentan como ocupados.
    expect(prismaMock.ticket.findMany.mock.calls[0][0]).toMatchObject({
      where: { flightId: "VUE_1", seat: { not: null }, id: { notIn: ["PAS_1"] } },
    });
  });

  it("solo ofrece a los pasajeros sin check-in", async () => {
    vi.mocked(getCheckinView).mockResolvedValue(
      view({
        groups: [
          group({
            passengers: [
              passenger({ checkedInAt: new Date("2026-11-19T20:00:00.000Z") }),
              passenger({ id: "PAS_2", firstName: "Juan", seat: "5B" }),
            ],
          }),
        ],
      }),
    );

    const result = await getSeatSelectionView("DEMO0001", "USU_1", NOW);

    expect(result?.flights[0].passengers.map((p) => p.id)).toEqual(["PAS_2"]);
  });

  it("sin ventana abierta o con todos los check-in hechos no hay vuelos para elegir", async () => {
    for (const groups of [
      [group({ state: "not-open" })],
      [group({ state: "closed" })],
      [group({ state: "unavailable" })],
      [group({ passengers: [passenger({ checkedInAt: new Date("2026-11-19T20:00:00.000Z") })] })],
    ]) {
      vi.mocked(getCheckinView).mockResolvedValue(view({ groups }));

      expect((await getSeatSelectionView("DEMO0001", "USU_1", NOW))?.flights).toEqual([]);
    }
    expect(prismaMock.flight.findMany).not.toHaveBeenCalled();
  });

  it("una compra no confirmada no tiene vuelos para elegir", async () => {
    vi.mocked(getCheckinView).mockResolvedValue(view({ status: "CANCELLED" }));

    expect(await getSeatSelectionView("DEMO0001", "USU_1", NOW)).toEqual({
      code: "DEMO0001",
      status: "CANCELLED",
      flights: [],
    });
  });
});
