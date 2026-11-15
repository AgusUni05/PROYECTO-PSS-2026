import { describe, expect, it } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { getCancellationQuote } from "./queries";
import { cancellableBookingRow } from "./test-fixtures";

const NOW = new Date("2026-11-14T10:00:00.000Z");

describe("getCancellationQuote (US-39)", () => {
  it("consulta la reserva por código y comprador, con sus pasajes emitidos", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(null);

    expect(await getCancellationQuote("GNQ47M", "USU_1", NOW)).toBeNull();
    expect(prismaMock.booking.findFirst.mock.calls[0][0]).toMatchObject({
      where: { code: "GNQ47M", buyerId: "USU_1" },
      select: { tickets: { where: { status: "ISSUED" } } },
    });
  });

  it("liquida la reserva y muestra la tarjeta original como medio de acreditación", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(cancellableBookingRow() as never);

    const quote = await getCancellationQuote("GNQ47M", "USU_1", NOW);

    expect(quote).toMatchObject({
      code: "GNQ47M",
      blocked: null,
      paymentMethod: "VISA •••• 1112",
      totals: { paid: "45000.00", penalty: "9000.00", refund: "36000.00" },
      lines: [{ passenger: "Laza, Franco", flight: { origin: { code: "EZE" } } }],
    });
  });

  it("en una venta de mostrador muestra el medio de cobro original", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      cancellableBookingRow({
        payments: [{ cardBrand: null, cardLast4: null, gateway: "Mostrador — Efectivo" }],
      }) as never,
    );

    const quote = await getCancellationQuote("GNQ47M", "USU_1", NOW);

    expect(quote?.paymentMethod).toBe("Mostrador — Efectivo");
  });

  it("detecta una contingencia pendiente en alguno de los pasajes", async () => {
    const row = cancellableBookingRow();
    row.tickets[0] = { ...row.tickets[0], contingencies: [{ id: "CON_1" }] as never };
    prismaMock.booking.findFirst.mockResolvedValue(row as never);

    const quote = await getCancellationQuote("GNQ47M", "USU_1", NOW);

    expect(quote?.blocked).toBe("contingency");
  });
});
