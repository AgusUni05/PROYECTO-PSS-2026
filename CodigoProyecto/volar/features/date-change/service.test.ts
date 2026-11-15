import { beforeEach, describe, expect, it } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { cancellableBookingRow } from "@/features/cancellation/test-fixtures";
import type { PaymentFormValues } from "@/features/purchase/schema";
import { CHANGE_PAYMENT_GATEWAY, changeBookingDate } from "./service";
import { candidateRow } from "./test-fixtures";

const NOW = new Date("2026-11-14T10:00:00.000Z");

const card = (numeroTarjeta: string): PaymentFormValues => ({
  medioPago: "CREDIT",
  numeroTarjeta,
  titular: "Franco Laza",
  vencimiento: "12/28",
  cvv: "123",
  cuotas: 1,
});

const change = (numero = "4111111111111112", flightId = "VUE_NUEVO") =>
  changeBookingDate("GNQ47M", "USU_1", flightId, card(numero), NOW);

beforeEach(() => {
  prismaMock.$transaction.mockImplementation(async (callback: unknown) => {
    if (typeof callback === "function") return callback(prismaMock);
    return Promise.all(callback as Promise<unknown>[]);
  });
  prismaMock.booking.findFirst.mockResolvedValue(cancellableBookingRow() as never);
  prismaMock.flight.findUnique.mockResolvedValue({ routeId: "TRA_1" } as never);
  prismaMock.flight.findMany.mockResolvedValue([candidateRow()] as never);
  prismaMock.booking.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.flight.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.ticket.findMany.mockResolvedValue([] as never);
  prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });
});

describe("changeBookingDate (US-39, cambio de fecha)", () => {
  it("no encuentra una reserva ajena o inexistente y no cobra", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(null);

    expect(await change()).toEqual({ ok: false, error: "No encontramos la reserva indicada." });
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it("con una contingencia pendiente deriva a la opción gratuita y no cobra", async () => {
    const row = cancellableBookingRow();
    row.tickets[0] = { ...row.tickets[0], contingencies: [{ id: "CON_1" }] as never };
    prismaMock.booking.findFirst.mockResolvedValue(row as never);

    const result = await change();

    expect(result.ok ? "" : result.error).toContain("sin penalidad");
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it("rechaza un vuelo que ya no es elegible sin cobrar", async () => {
    expect(await change("4111111111111112", "VUE_OTRO")).toEqual({
      ok: false,
      error: "El vuelo elegido ya no está disponible. Elegí otra opción.",
    });
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it("con la tarjeta rechazada registra el intento y no cambia la reserva", async () => {
    const result = await change("4111111111111111");

    expect(result).toMatchObject({ ok: false });
    expect(result.ok ? "" : result.error).toContain("rechazado");
    expect(prismaMock.payment.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.payment.create.mock.calls[0][0].data).toMatchObject({
      bookingId: "RES_1",
      amount: "9750.00",
      status: "REJECTED",
      gateway: CHANGE_PAYMENT_GATEWAY,
      cardLast4: "1111",
    });
    expect(prismaMock.ticket.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.flight.updateMany).not.toHaveBeenCalled();
  });

  it("con el pago aprobado mueve los pasajes al vuelo nuevo y registra el adicional", async () => {
    prismaMock.ticket.findMany.mockResolvedValue([{ seat: "1A" }] as never);

    const result = await change();

    expect(result).toMatchObject({ ok: true, data: { flightCode: "VU-20261123-002", total: "9750.00" } });
    expect(prismaMock.booking.updateMany).toHaveBeenCalledWith({
      where: { id: "RES_1", buyerId: "USU_1", status: "CONFIRMED" },
      data: { updatedAt: NOW },
    });
    expect(prismaMock.flight.updateMany).toHaveBeenCalledWith({
      where: { id: "VUE_NUEVO", status: "SCHEDULED", departureAt: { gt: NOW }, economyOccupied: { lte: 99 } },
      data: { economyOccupied: { increment: 1 } },
    });
    expect(prismaMock.flight.update).toHaveBeenCalledWith({
      where: { id: "VUE_1" },
      data: { economyOccupied: { decrement: 1 } },
    });
    const ticketUpdate = prismaMock.ticket.updateMany.mock.calls[0][0];
    expect(ticketUpdate.where).toEqual({
      id: "PAS_1",
      bookingId: "RES_1",
      status: "ISSUED",
      contingencies: { none: { resolution: "PENDING" } },
    });
    expect(ticketUpdate.data).toMatchObject({
      flightId: "VUE_NUEVO",
      seat: "1B",
      issuedAt: NOW,
      unitPrice: "48000.00",
      checkedInAt: null,
    });
    expect(String((ticketUpdate.data as { number: string }).number)).toMatch(/^ETK-GNQ47M-1-C/);
    expect(prismaMock.payment.create.mock.calls[0][0].data).toMatchObject({
      amount: "9750.00",
      status: "APPROVED",
      gateway: CHANGE_PAYMENT_GATEWAY,
      cardBrand: "VISA",
      cardLast4: "1112",
    });
  });

  it("si al escribir ya no hay cupo, no cobra ni cambia nada", async () => {
    prismaMock.flight.updateMany.mockResolvedValue({ count: 0 });

    expect(await change()).toEqual({
      ok: false,
      error: "Se agotaron los cupos del vuelo elegido. No se realizó ningún cobro; elegí otra opción.",
    });
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it("si la reserva cambió mientras tanto, no cobra ni cambia nada", async () => {
    prismaMock.booking.updateMany.mockResolvedValue({ count: 0 });

    expect(await change()).toEqual({
      ok: false,
      error: "La reserva cambió mientras hacías el cambio. No se realizó ningún cobro; volvé a intentarlo.",
    });
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });
});
