import { describe, expect, it } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { assignSeats, issueComprobantes, seatRows, type BookingToIssue } from "./issuance";

describe("seatRows (US-23)", () => {
  it("calcula las filas según la capacidad de la clase", () => {
    expect(seatRows("ECONOMY", 150)).toBe(25); // 6 asientos por fila
    expect(seatRows("FIRST", 12)).toBe(3); // 4 asientos por fila
    expect(seatRows("ECONOMY", 1)).toBe(1);
  });
});

describe("assignSeats (US-23)", () => {
  const ECONOMY = ["A", "B", "C", "D", "E", "F"];

  it("asigna asientos en orden de fila y letra", () => {
    expect(assignSeats([], 3, 25, ECONOMY)).toEqual(["1A", "1B", "1C"]);
  });

  it("saltea los asientos que ya ocupan otros pasajes del vuelo", () => {
    expect(assignSeats(["1A", "1B", "2A"], 3, 25, ECONOMY)).toEqual(["1C", "1D", "1E"]);
  });

  it("sigue en la fila siguiente al completar la anterior", () => {
    expect(assignSeats(["1A", "1B", "1C", "1D"], 3, 2, ECONOMY)).toEqual(["1E", "1F", "2A"]);
  });

  it("devuelve solo lo que alcanza si no quedan asientos libres", () => {
    expect(assignSeats([], 8, 1, ECONOMY)).toEqual(["1A", "1B", "1C", "1D", "1E", "1F"]);
  });
});

describe("issueComprobantes (US-23/US-24)", () => {
  const booking: BookingToIssue = {
    id: "RES_1",
    code: "DEMO0001",
    flightId: "VUE_1",
    seatClass: "ECONOMY",
    contactName: "Pasajero Demo",
    contactEmail: "demo@volar.test",
    totalAmount: { toString: () => "90000" } as never,
    flight: { code: "VU-DEMO-01", economyCapacity: 150, firstClassCapacity: 12 },
    tickets: [
      {
        id: "PAS_1",
        firstName: "María",
        lastName: "Demo",
        unitPrice: { toString: () => "45000" } as never,
      },
      {
        id: "PAS_2",
        firstName: "Juan",
        lastName: "Demo",
        unitPrice: { toString: () => "45000" } as never,
      },
    ],
  };

  it("emite cada pasaje con número y asiento y genera factura y correo", async () => {
    prismaMock.ticket.findMany.mockResolvedValue([] as never);

    await issueComprobantes(prismaMock as never, booking, new Date("2026-10-07T12:00:00Z"));

    const updates = prismaMock.ticket.update.mock.calls.map(
      (call) => call[0] as { where: { id: string }; data: Record<string, unknown> },
    );
    expect(updates.map((update) => update.where.id)).toEqual(["PAS_1", "PAS_2"]);
    expect(updates[0].data).toMatchObject({
      status: "ISSUED",
      number: "ETK-DEMO0001-1",
      seat: "1A",
      issuedAt: new Date("2026-10-07T12:00:00Z"),
    });
    expect(updates[1].data).toMatchObject({ number: "ETK-DEMO0001-2", seat: "1B" });

    const invoice = prismaMock.invoice.create.mock.calls[0][0];
    const invoiceItems = (invoice.data.items as { create: Record<string, unknown>[] }).create;
    expect(invoice.data).toMatchObject({
      bookingId: "RES_1",
      customerName: "Pasajero Demo",
      customerEmail: "demo@volar.test",
    });
    expect(invoiceItems).toHaveLength(2);
    expect(invoiceItems[0]).toMatchObject({
      quantity: 1,
      description: expect.stringContaining("Pasaje Economy VU-DEMO-01 - Demo, María"),
    });

    // US-24: envío simulado al correo del comprador.
    expect(prismaMock.emailNotification.create.mock.calls[0][0].data).toMatchObject({
      type: "PURCHASE_CONFIRMATION",
      recipientEmail: "demo@volar.test",
      status: "SENT",
      sentAt: new Date("2026-10-07T12:00:00Z"),
    });
  });

  it("no reutiliza asientos ya ocupados por pasajes emitidos del vuelo", async () => {
    prismaMock.ticket.findMany.mockResolvedValue([{ seat: "1A" }] as never);

    await issueComprobantes(prismaMock as never, booking, new Date());

    const seats = prismaMock.ticket.update.mock.calls.map(
      (call) => (call[0].data as { seat: string }).seat,
    );
    expect(seats).toEqual(["1B", "1C"]);
  });

  it("falla entera si no quedan asientos libres", async () => {
    prismaMock.ticket.findMany.mockResolvedValue([] as never);

    // Primera Clase con 1 fila (4 asientos) y 5 pasajeros: no alcanza.
    await expect(
      issueComprobantes(
        prismaMock as never,
        {
          ...booking,
          seatClass: "FIRST",
          flight: { code: "VU-DEMO-01", economyCapacity: 150, firstClassCapacity: 1 },
          tickets: Array.from({ length: 5 }, (_, index) => ({
            id: `PAS_${index}`,
            firstName: "Ana",
            lastName: "Demo",
            unitPrice: { toString: () => "45000" } as never,
          })),
        },
        new Date(),
      ),
    ).rejects.toThrow("NO_SEATS");
    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
    expect(prismaMock.invoice.create).not.toHaveBeenCalled();
  });
});
