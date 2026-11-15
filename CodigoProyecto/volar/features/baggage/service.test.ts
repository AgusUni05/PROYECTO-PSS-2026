import { beforeEach, describe, expect, it } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import type { PaymentFormValues } from "@/features/purchase/schema";
import { BAGGAGE_PAYMENT_GATEWAY, addExtraBaggage, type BaggageSelection } from "./service";

// Vuelo a 10 horas: la ventana de check-in (24 h antes, hasta el embarque) está abierta.
const NOW = new Date("2026-11-19T10:00:00.000Z");
const DEPARTURE = new Date("2026-11-19T20:00:00.000Z");

const card = (numeroTarjeta: string): PaymentFormValues => ({
  medioPago: "CREDIT",
  numeroTarjeta,
  titular: "Franco Laza",
  vencimiento: "12/28",
  cvv: "123",
  cuotas: 1,
});

function ticketRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "PAS_1",
    status: "ISSUED",
    checkedInAt: null,
    extraBags: 0,
    firstName: "Juan",
    lastName: "Pérez",
    flight: { code: "VU-20261119-01", status: "SCHEDULED", departureAt: DEPARTURE },
    ...overrides,
  };
}

function bookingRow(tickets = [ticketRow()], overrides: Record<string, unknown> = {}) {
  return { id: "RES_1", status: "CONFIRMED", tickets, ...overrides };
}

const add = (selections: BaggageSelection[] = [{ ticketId: "PAS_1", bags: 2 }], numero = "4111111111111112") =>
  addExtraBaggage("GNQ47M", "USU_1", selections, card(numero), NOW);

beforeEach(() => {
  prismaMock.$transaction.mockImplementation(async (callback: unknown) => {
    if (typeof callback === "function") return callback(prismaMock);
    return Promise.all(callback as Promise<unknown>[]);
  });
  prismaMock.booking.findFirst.mockResolvedValue(bookingRow() as never);
  prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });
});

describe("addExtraBaggage (US-41, equipaje adicional)", () => {
  it("no encuentra una reserva ajena o inexistente y no cobra", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(null);

    expect(await add()).toEqual({ ok: false, error: "No encontramos la reserva indicada." });
    expect(prismaMock.booking.findFirst.mock.calls[0][0]?.where).toEqual({ code: "GNQ47M", buyerId: "USU_1" });
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it("rechaza un pasajero que no es de la reserva", async () => {
    const result = await add([
      { ticketId: "PAS_1", bags: 1 },
      { ticketId: "PAS_OTRO", bags: 1 },
    ]);

    expect(result).toEqual({ ok: false, error: "Alguno de los pasajeros elegidos no pertenece a esta reserva." });
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it("con la ventana de check-in cerrada no cobra", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      bookingRow([ticketRow({ flight: { code: "VU-1", status: "SCHEDULED", departureAt: new Date("2026-11-22T20:00:00.000Z") } })]) as never,
    );

    expect(await add()).toEqual({
      ok: false,
      error: "El check-in todavía no está habilitado: abre 24 horas antes de la salida.",
    });
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it("no agrega equipaje a un pasajero que ya hizo el check-in", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(bookingRow([ticketRow({ checkedInAt: NOW })]) as never);

    expect(await add()).toEqual({
      ok: false,
      error: "El equipaje adicional se agrega antes de confirmar el check-in del pasajero.",
    });
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it("respeta el tope de valijas por pasajero contando las ya compradas", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(bookingRow([ticketRow({ extraBags: 2 })]) as never);

    expect(await add([{ ticketId: "PAS_1", bags: 2 }])).toEqual({
      ok: false,
      error: "Cada pasajero puede llevar hasta 3 valijas adicionales.",
    });
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it("con el pago rechazado lo registra y no suma valijas ni toca la factura", async () => {
    const result = await add(undefined, "4111111111111111");

    expect(result).toMatchObject({ ok: false });
    expect(prismaMock.payment.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.payment.create.mock.calls[0][0].data).toMatchObject({
      status: "REJECTED",
      amount: 90000,
      gateway: BAGGAGE_PAYMENT_GATEWAY,
    });
    expect(prismaMock.ticket.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.invoice.update).not.toHaveBeenCalled();
  });

  it("con el pago aprobado suma las valijas, cobra y agrega el desglose a la factura", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      bookingRow([ticketRow(), ticketRow({ id: "PAS_2", firstName: "Ana", extraBags: 1 })]) as never,
    );

    const result = await add([
      { ticketId: "PAS_1", bags: 2 },
      { ticketId: "PAS_2", bags: 1 },
    ]);

    expect(result).toMatchObject({ ok: true, data: { bags: 3, total: 135000 } });

    expect(prismaMock.ticket.updateMany).toHaveBeenCalledTimes(2);
    expect(prismaMock.ticket.updateMany.mock.calls[1][0]).toMatchObject({
      where: { id: "PAS_2", bookingId: "RES_1", status: "ISSUED", checkedInAt: null, extraBags: 1 },
      data: { extraBags: { increment: 1 } },
    });

    expect(prismaMock.payment.create.mock.calls[0][0].data).toMatchObject({
      status: "APPROVED",
      amount: 135000,
      gateway: BAGGAGE_PAYMENT_GATEWAY,
      cardLast4: "1112",
    });

    const invoiceUpdate = prismaMock.invoice.update.mock.calls[0][0];
    expect(invoiceUpdate.where).toEqual({ bookingId: "RES_1" });
    expect(invoiceUpdate.data).toMatchObject({
      totalAmount: { increment: 135000 },
      items: {
        create: [
          {
            description: "Equipaje adicional en bodega VU-20261119-01 - Pérez, Juan",
            quantity: 2,
            unitPrice: 45000,
            amount: 90000,
          },
          {
            description: "Equipaje adicional en bodega VU-20261119-01 - Pérez, Ana",
            quantity: 1,
            unitPrice: 45000,
            amount: 45000,
          },
        ],
      },
    });
  });

  it("si el pasaje cambió mientras tanto (doble envío, check-in), no cobra ni suma nada", async () => {
    prismaMock.ticket.updateMany.mockResolvedValue({ count: 0 });

    expect(await add()).toEqual({
      ok: false,
      error: "La reserva o el vuelo cambiaron mientras agregabas el equipaje. No se realizó ningún cobro; volvé a intentarlo.",
    });
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
    expect(prismaMock.invoice.update).not.toHaveBeenCalled();
  });
});
