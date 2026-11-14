import { describe, expect, it } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { cancellableBookingRow } from "@/features/cancellation/test-fixtures";
import { getChangeOptions } from "./queries";
import { candidateRow } from "./test-fixtures";

const NOW = new Date("2026-11-14T10:00:00.000Z");

describe("getChangeOptions (US-39, cambio de fecha)", () => {
  it("una reserva ajena o inexistente devuelve null", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(null);

    expect(await getChangeOptions("GNQ47M", "USU_1", NOW)).toBeNull();
  });

  it("con una contingencia pendiente queda bloqueada y no busca vuelos", async () => {
    const row = cancellableBookingRow();
    row.tickets[0] = { ...row.tickets[0], contingencies: [{ id: "CON_1" }] as never };
    prismaMock.booking.findFirst.mockResolvedValue(row as never);

    const options = await getChangeOptions("GNQ47M", "USU_1", NOW);

    expect(options).toMatchObject({ blocked: "contingency", candidates: [] });
    expect(prismaMock.flight.findMany).not.toHaveBeenCalled();
  });

  it("ofrece vuelos de la misma ruta, sin el actual, a la venta y con cupo para todos", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(cancellableBookingRow() as never);
    prismaMock.flight.findUnique.mockResolvedValue({ routeId: "TRA_1" } as never);
    prismaMock.flight.findMany.mockResolvedValue([
      candidateRow(),
      // Sin cupo en Economy para el pasajero.
      candidateRow({ id: "VUE_LLENO", economyOccupied: 100 }),
      // Fuera de su período de venta.
      candidateRow({
        id: "VUE_FUERA",
        salesPeriod: { startDate: new Date("2026-12-01T00:00:00.000Z"), endDate: new Date("2026-12-31T00:00:00.000Z") },
      }),
    ] as never);

    const options = await getChangeOptions("GNQ47M", "USU_1", NOW);

    expect(prismaMock.flight.findMany.mock.calls[0][0]).toMatchObject({
      where: {
        routeId: "TRA_1",
        id: { notIn: ["VUE_1"] },
        status: "SCHEDULED",
        departureAt: { gt: NOW },
      },
      orderBy: { departureAt: "asc" },
    });
    expect(options?.blocked).toBeNull();
    expect(options?.candidates).toEqual([
      {
        id: "VUE_NUEVO",
        code: "VU-20261123-002",
        date: new Date("2026-11-23T00:00:00.000Z"),
        departureAt: new Date("2026-11-23T08:30:00.000Z"),
        arrivalAt: new Date("2026-11-23T10:00:00.000Z"),
        fare: "48000",
        available: 90,
        capacity: 100,
      },
    ]);
  });
});
