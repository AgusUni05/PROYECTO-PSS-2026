import { beforeEach, describe, expect, it } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { checkInPassengers } from "./service";

const NOW = new Date("2026-11-20T00:00:00.000Z");
// Sale en 10 h: dentro de la ventana (abre 24 h antes, cierra 40 min antes).
const DEPARTURE_OPEN = new Date("2026-11-20T10:00:00.000Z");

function ticketRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "PAS_1",
    status: "ISSUED",
    checkedInAt: null,
    flight: { status: "SCHEDULED", departureAt: DEPARTURE_OPEN },
    ...overrides,
  };
}

function bookingRow(tickets: unknown[], overrides: Record<string, unknown> = {}) {
  return { id: "RES_1", status: "CONFIRMED", tickets, ...overrides };
}

beforeEach(() => {
  prismaMock.$transaction.mockImplementation(async (callback: unknown) => {
    if (typeof callback === "function") return callback(prismaMock);
    return Promise.all(callback as Promise<unknown>[]);
  });
});

describe("checkInPassengers (US-38)", () => {
  it("busca la reserva por código y por el comprador de la sesión, con solo los pasajes elegidos", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(null);

    await checkInPassengers("DEMO0001", "USU_1", ["PAS_1"], NOW);

    expect(prismaMock.booking.findFirst.mock.calls[0][0]).toMatchObject({
      where: { code: "DEMO0001", buyerId: "USU_1" },
      select: { tickets: { where: { id: { in: ["PAS_1"] } } } },
    });
  });

  it("no encuentra una reserva ajena o inexistente", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(null);

    const result = await checkInPassengers("DEMO0001", "USU_OTRO", ["PAS_1"], NOW);

    expect(result).toEqual({ ok: false, error: "No encontramos la reserva indicada." });
  });

  it("exige que la compra esté confirmada", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      bookingRow([ticketRow()], { status: "CANCELLED" }) as never,
    );

    const result = await checkInPassengers("DEMO0001", "USU_1", ["PAS_1"], NOW);

    expect(result).toMatchObject({ ok: false, error: "La compra no está confirmada." });
  });

  it("rechaza pasajes que no pertenecen a la reserva", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(bookingRow([ticketRow()]) as never);

    const result = await checkInPassengers("DEMO0001", "USU_1", ["PAS_1", "PAS_AJENO"], NOW);

    expect(result).toMatchObject({ ok: false });
    expect(prismaMock.ticket.updateMany).not.toHaveBeenCalled();
  });

  it("rechaza pasajes reembolsados o cancelados", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      bookingRow([ticketRow({ status: "REFUNDED" })]) as never,
    );

    const result = await checkInPassengers("DEMO0001", "USU_1", ["PAS_1"], NOW);

    expect(result).toMatchObject({ ok: false, error: "Alguno de los pasajes elegidos ya no está activo." });
    expect(prismaMock.ticket.updateMany).not.toHaveBeenCalled();
  });

  it("rechaza vuelos cancelados", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      bookingRow([ticketRow({ flight: { status: "CANCELLED", departureAt: DEPARTURE_OPEN } })]) as never,
    );

    const result = await checkInPassengers("DEMO0001", "USU_1", ["PAS_1"], NOW);

    expect(result).toMatchObject({ ok: false, error: "El vuelo de alguno de los pasajes no está programado." });
  });

  it("no permite el check-in antes de las 24 horas previas", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      bookingRow([
        ticketRow({ flight: { status: "SCHEDULED", departureAt: new Date("2026-11-22T10:00:00.000Z") } }),
      ]) as never,
    );

    const result = await checkInPassengers("DEMO0001", "USU_1", ["PAS_1"], NOW);

    expect(result).toMatchObject({
      ok: false,
      error: "El check-in todavía no está habilitado: abre 24 horas antes de la salida.",
    });
  });

  it("no permite el check-in después de la hora de embarque", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      bookingRow([
        ticketRow({ flight: { status: "SCHEDULED", departureAt: new Date("2026-11-20T00:30:00.000Z") } }),
      ]) as never,
    );

    const result = await checkInPassengers("DEMO0001", "USU_1", ["PAS_1"], NOW);

    expect(result).toMatchObject({ ok: false, error: "El check-in de este vuelo ya cerró." });
  });

  it("registra el check-in y revalida pasaje, vuelo y ventana al escribir", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      bookingRow([ticketRow(), ticketRow({ id: "PAS_2" })]) as never,
    );
    prismaMock.ticket.updateMany.mockResolvedValue({ count: 2 });

    const result = await checkInPassengers("DEMO0001", "USU_1", ["PAS_1", "PAS_2"], NOW);

    expect(result).toEqual({ ok: true, data: { checkedIn: 2 } });
    expect(prismaMock.ticket.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["PAS_1", "PAS_2"] },
        bookingId: "RES_1",
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
      data: { checkedInAt: NOW },
    });
  });

  it("no repite el check-in de un pasajero que ya lo hizo", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      bookingRow([
        ticketRow({ checkedInAt: new Date("2026-11-19T20:00:00.000Z") }),
        ticketRow({ id: "PAS_2" }),
      ]) as never,
    );
    prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });

    const result = await checkInPassengers("DEMO0001", "USU_1", ["PAS_1", "PAS_2"], NOW);

    expect(result).toEqual({ ok: true, data: { checkedIn: 1 } });
    expect(prismaMock.ticket.updateMany.mock.calls[0][0].where).toMatchObject({ id: { in: ["PAS_2"] } });
  });

  it("si todos ya tenían check-in, no escribe nada", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      bookingRow([ticketRow({ checkedInAt: new Date("2026-11-19T20:00:00.000Z") })]) as never,
    );

    const result = await checkInPassengers("DEMO0001", "USU_1", ["PAS_1"], NOW);

    expect(result).toEqual({ ok: true, data: { checkedIn: 0 } });
    expect(prismaMock.ticket.updateMany).not.toHaveBeenCalled();
  });

  it("si algo cambió entre la lectura y la escritura, no deja el check-in a medias", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      bookingRow([ticketRow(), ticketRow({ id: "PAS_2" })]) as never,
    );
    prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });

    const result = await checkInPassengers("DEMO0001", "USU_1", ["PAS_1", "PAS_2"], NOW);

    expect(result).toEqual({
      ok: false,
      error: "La reserva o el vuelo cambiaron mientras hacías el check-in. Volvé a intentarlo.",
    });
  });

  it("exige al menos un pasajero", async () => {
    const result = await checkInPassengers("DEMO0001", "USU_1", [], NOW);

    expect(result).toMatchObject({ ok: false, error: "Elegí al menos un pasajero." });
    expect(prismaMock.booking.findFirst).not.toHaveBeenCalled();
  });
});
