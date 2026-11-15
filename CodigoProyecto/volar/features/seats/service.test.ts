import { beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { prismaMock } from "@/tests/prisma-mock";
import { chooseSeats } from "./service";

const NOW = new Date("2026-11-20T00:00:00.000Z");
// Sale en 10 h: dentro de la ventana de check-in (abre 24 h antes, cierra 40 min antes).
const DEPARTURE_OPEN = new Date("2026-11-20T10:00:00.000Z");
// 150 asientos de Economy: filas 1 a 25 (6 por fila).
const FLIGHT = {
  status: "SCHEDULED",
  departureAt: DEPARTURE_OPEN,
  economyCapacity: 150,
  firstClassCapacity: 16,
};

function ticketRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "PAS_1",
    status: "ISSUED",
    seat: "5A",
    seatClass: "ECONOMY",
    checkedInAt: null,
    flightId: "VUE_1",
    flight: FLIGHT,
    ...overrides,
  };
}

function bookingRow(tickets: unknown[], overrides: Record<string, unknown> = {}) {
  return { id: "RES_1", status: "CONFIRMED", tickets, ...overrides };
}

const choose = (choices: { ticketId: string; seat: string }[], now = NOW) =>
  chooseSeats("DEMO0001", "USU_1", "VUE_1", choices, now);

beforeEach(() => {
  prismaMock.$transaction.mockImplementation(async (callback: unknown) => {
    if (typeof callback === "function") return callback(prismaMock);
    return Promise.all(callback as Promise<unknown>[]);
  });
  prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });
});

describe("chooseSeats (US-37)", () => {
  it("busca la reserva por código y por el comprador de la sesión, con solo los pasajes elegidos", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(null);

    const result = await choose([{ ticketId: "PAS_1", seat: "7C" }]);

    expect(result).toEqual({ ok: false, error: "No encontramos la reserva indicada." });
    expect(prismaMock.booking.findFirst.mock.calls[0][0]).toMatchObject({
      where: { code: "DEMO0001", buyerId: "USU_1" },
      select: { tickets: { where: { id: { in: ["PAS_1"] } } } },
    });
  });

  it("rechaza dos pasajeros en el mismo asiento sin consultar la base", async () => {
    const result = await choose([
      { ticketId: "PAS_1", seat: "7C" },
      { ticketId: "PAS_2", seat: "7C" },
    ]);

    expect(result).toEqual({ ok: false, error: "Dos pasajeros no pueden tener el mismo asiento." });
    expect(prismaMock.booking.findFirst).not.toHaveBeenCalled();
  });

  it("exige que la compra esté confirmada", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(bookingRow([ticketRow()], { status: "CANCELLED" }) as never);

    expect(await choose([{ ticketId: "PAS_1", seat: "7C" }])).toMatchObject({
      ok: false,
      error: "La compra no está confirmada.",
    });
  });

  it("rechaza pasajes que no pertenecen a la reserva", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(bookingRow([]) as never);

    expect(await choose([{ ticketId: "PAS_OTRO", seat: "7C" }])).toMatchObject({
      ok: false,
      error: "Alguno de los pasajeros elegidos no pertenece a esta reserva.",
    });
  });

  it("rechaza un pasaje de otro vuelo de la reserva", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(bookingRow([ticketRow({ flightId: "VUE_2" })]) as never);

    expect((await choose([{ ticketId: "PAS_1", seat: "7C" }])).ok).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("después del check-in el asiento queda fijo", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      bookingRow([ticketRow({ checkedInAt: new Date("2026-11-19T20:00:00.000Z") })]) as never,
    );

    expect(await choose([{ ticketId: "PAS_1", seat: "7C" }])).toMatchObject({
      ok: false,
      error: "Un pasajero que ya hizo el check-in no puede cambiar de asiento.",
    });
  });

  it("solo con la ventana de check-in abierta", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(bookingRow([ticketRow()]) as never);

    const early = await choose([{ ticketId: "PAS_1", seat: "7C" }], new Date("2026-11-18T00:00:00.000Z"));
    const late = await choose([{ ticketId: "PAS_1", seat: "7C" }], new Date("2026-11-20T09:30:00.000Z"));

    expect(early).toMatchObject({ ok: false, error: expect.stringContaining("24 horas antes") });
    expect(late).toMatchObject({ ok: false, error: "El check-in de este vuelo ya cerró." });
  });

  it("solo asientos de la clase del pasaje", async () => {
    // 26A no existe con 150 asientos de Economy (filas 1 a 25).
    prismaMock.booking.findFirst.mockResolvedValue(bookingRow([ticketRow()]) as never);
    expect(await choose([{ ticketId: "PAS_1", seat: "26A" }])).toMatchObject({
      ok: false,
      error: "El asiento 26A no corresponde a la clase del pasaje.",
    });

    // Primera tiene 4 asientos por fila: no hay letra E.
    prismaMock.booking.findFirst.mockResolvedValue(
      bookingRow([ticketRow({ seat: "1A", seatClass: "FIRST" })]) as never,
    );
    expect(await choose([{ ticketId: "PAS_1", seat: "1E" }])).toMatchObject({
      ok: false,
      error: "El asiento 1E no corresponde a la clase del pasaje.",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("sin cambios no escribe nada", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(bookingRow([ticketRow()]) as never);

    expect(await choose([{ ticketId: "PAS_1", seat: "5A" }])).toEqual({ ok: true, data: { changed: 0 } });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("libera los asientos actuales revalidando todo y asigna los nuevos (permite intercambiarlos)", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      bookingRow([ticketRow(), ticketRow({ id: "PAS_2", seat: "5B" })]) as never,
    );
    prismaMock.ticket.updateMany.mockResolvedValue({ count: 2 });

    const result = await choose([
      { ticketId: "PAS_1", seat: "5B" },
      { ticketId: "PAS_2", seat: "5A" },
    ]);

    expect(result).toEqual({ ok: true, data: { changed: 2 } });
    expect(prismaMock.ticket.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["PAS_1", "PAS_2"] },
        bookingId: "RES_1",
        flightId: "VUE_1",
        status: "ISSUED",
        checkedInAt: null,
        flight: {
          is: {
            status: "SCHEDULED",
            departureAt: {
              gt: new Date("2026-11-20T00:40:00.000Z"),
              lte: new Date("2026-11-21T00:00:00.000Z"),
            },
          },
        },
      },
      data: { seat: null },
    });
    expect(prismaMock.ticket.update.mock.calls.map((call) => call[0])).toEqual([
      { where: { id: "PAS_1" }, data: { seat: "5B" } },
      { where: { id: "PAS_2" }, data: { seat: "5A" } },
    ]);
  });

  it("si algo cambió al escribir no asigna nada", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(bookingRow([ticketRow()]) as never);
    prismaMock.ticket.updateMany.mockResolvedValue({ count: 0 });

    const result = await choose([{ ticketId: "PAS_1", seat: "7C" }]);

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("cambiaron") });
    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
  });

  it("si otro comprador tomó el asiento, la restricción única lo bloquea y avisa", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(bookingRow([ticketRow()]) as never);
    prismaMock.ticket.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.10.0",
      }),
    );

    expect(await choose([{ ticketId: "PAS_1", seat: "7C" }])).toEqual({
      ok: false,
      error: "Alguno de los asientos elegidos se acaba de ocupar. Elegí otro.",
    });
  });
});
