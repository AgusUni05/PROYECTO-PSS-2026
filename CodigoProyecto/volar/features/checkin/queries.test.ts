import { describe, expect, it } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { getCheckinView } from "./queries";

const NOW = new Date("2026-11-20T00:00:00.000Z");

function flight(overrides: Record<string, unknown> = {}) {
  return {
    id: "VUE_1",
    code: "VU-20261120-002",
    date: new Date("2026-11-20T00:00:00.000Z"),
    departureAt: new Date("2026-11-20T10:00:00.000Z"),
    status: "SCHEDULED",
    route: {
      origin: { code: "EZE", city: "Buenos Aires" },
      destination: { code: "MDZ", city: "Mendoza" },
    },
    ...overrides,
  };
}

function ticket(overrides: Record<string, unknown> = {}) {
  return {
    id: "PAS_1",
    number: "ETK-DEMO0001-1",
    seat: "1A",
    seatClass: "ECONOMY",
    firstName: "Maria",
    lastName: "Demo",
    documentType: "DNI",
    documentNumber: "30000001",
    checkedInAt: null,
    flight: flight(),
    ...overrides,
  };
}

describe("getCheckinView (US-38)", () => {
  it("consulta la reserva por código y comprador, solo con pasajes emitidos", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(null);

    const view = await getCheckinView("DEMO0001", "USU_1", NOW);

    expect(view).toBeNull();
    expect(prismaMock.booking.findFirst.mock.calls[0][0]).toMatchObject({
      where: { code: "DEMO0001", buyerId: "USU_1" },
      select: { tickets: { where: { status: "ISSUED" } } },
    });
  });

  it("agrupa los pasajeros por su vuelo actual con el estado de la ventana", async () => {
    prismaMock.booking.findFirst.mockResolvedValue({
      code: "DEMO0001",
      status: "CONFIRMED",
      tickets: [
        ticket(),
        ticket({ id: "PAS_2", firstName: "Juan", seat: "1B" }),
        ticket({
          id: "PAS_3",
          firstName: "Ana",
          flight: flight({ id: "VUE_2", code: "VU-20261125-002", departureAt: new Date("2026-11-25T10:00:00.000Z") }),
        }),
      ],
    } as never);

    const view = await getCheckinView("DEMO0001", "USU_1", NOW);

    expect(view?.groups.map((g) => [g.flight.code, g.state, g.passengers.map((p) => p.id)])).toEqual([
      ["VU-20261120-002", "open", ["PAS_1", "PAS_2"]],
      ["VU-20261125-002", "not-open", ["PAS_3"]],
    ]);
    expect(view?.groups[0]).toMatchObject({
      opensAt: new Date("2026-11-19T10:00:00.000Z"),
      boardingAt: new Date("2026-11-20T09:20:00.000Z"),
      flight: { origin: { code: "EZE" }, destination: { code: "MDZ" } },
    });
  });

  it("marca no disponible un vuelo cancelado aunque esté dentro de la ventana", async () => {
    prismaMock.booking.findFirst.mockResolvedValue({
      code: "DEMO0001",
      status: "CONFIRMED",
      tickets: [ticket({ flight: flight({ status: "CANCELLED" }) })],
    } as never);

    const view = await getCheckinView("DEMO0001", "USU_1", NOW);

    expect(view?.groups[0].state).toBe("unavailable");
  });

  it("ordena los vuelos por salida", async () => {
    prismaMock.booking.findFirst.mockResolvedValue({
      code: "DEMO0001",
      status: "CONFIRMED",
      tickets: [
        ticket({ flight: flight({ id: "VUE_TARDE", departureAt: new Date("2026-11-26T10:00:00.000Z") }) }),
        ticket({ id: "PAS_2", flight: flight({ id: "VUE_TEMPRANO" }) }),
      ],
    } as never);

    const view = await getCheckinView("DEMO0001", "USU_1", NOW);

    expect(view?.groups.map((g) => g.flight.id)).toEqual(["VUE_TEMPRANO", "VUE_TARDE"]);
  });
});
