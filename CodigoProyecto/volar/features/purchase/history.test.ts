import { describe, expect, it } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import { prismaMock } from "@/tests/prisma-mock";
import { getPurchaseHistoryForUser } from "./history";

const NOW = new Date("2026-11-01T12:00:00.000Z");

function flightRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "VUE_1",
    code: "VU-20261105-01",
    date: new Date("2026-11-05T00:00:00.000Z"),
    departureAt: new Date("2026-11-05T10:00:00.000Z"),
    arrivalAt: new Date("2026-11-05T13:00:00.000Z"),
    status: "SCHEDULED",
    route: {
      origin: { code: "EZE", city: "Buenos Aires" },
      destination: { code: "MDZ", city: "Mendoza" },
    },
    ...overrides,
  };
}

function ticketRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "PAS_1",
    number: "ETK-ABC12345-1",
    seat: "12A",
    seatClass: "ECONOMY",
    status: "ISSUED",
    firstName: "Ana",
    lastName: "Pérez",
    documentType: "DNI",
    documentNumber: "30111222",
    issuedAt: new Date("2026-10-20T15:00:00.000Z"),
    flight: flightRow(),
    contingencies: [],
    ...overrides,
  };
}

function contingencyRow(overrides: Record<string, unknown> = {}) {
  return {
    ticketId: "PAS_1",
    accessToken: "tok_abc123",
    flightChange: {
      type: "SCHEDULE_CHANGE",
      previousDepartureAt: new Date("2026-10-28T10:00:00.000Z"),
      previousArrivalAt: new Date("2026-10-28T13:00:00.000Z"),
      newDepartureAt: new Date("2026-10-28T18:00:00.000Z"),
      newArrivalAt: new Date("2026-10-28T21:00:00.000Z"),
      reason: "Cambio operativo",
    },
    ...overrides,
  };
}

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "RES_1",
    code: "ABC12345",
    status: "CONFIRMED",
    createdAt: new Date("2026-10-20T14:00:00.000Z"),
    confirmedAt: new Date("2026-10-20T15:00:00.000Z"),
    totalAmount: { toString: () => "135000" },
    quantity: 3,
    seatClass: "ECONOMY",
    invoice: { id: "FAC_1", number: 7, issuedAt: new Date("2026-10-20T15:00:00.000Z") },
    tickets: [ticketRow()],
    // Datos que la consulta nunca debe seleccionar ni exponer (US-35 / RNF-08).
    contactEmail: "demo@volar.test",
    payments: [
      { transactionId: "TX-ABCDEF123456", cardLast4: "4242", cardBrand: "VISA" },
    ],
    buyer: { id: "USU_1", email: "demo@volar.test" },
    seller: { id: "USU_9", email: "mostrador@volar.test" },
    ...overrides,
  };
}

function findManyArgs(): Prisma.BookingFindManyArgs {
  const calls = prismaMock.booking.findMany.mock.calls;
  return calls[calls.length - 1][0] as Prisma.BookingFindManyArgs;
}

function findManySelect(): Record<string, unknown> {
  return (findManyArgs().select ?? {}) as unknown as Record<string, unknown>;
}

describe("getPurchaseHistoryForUser (US-35)", () => {
  it("filtra por comprador y solo por compras confirmadas o canceladas, sin pagos", async () => {
    prismaMock.booking.findMany.mockResolvedValue([] as never);

    await getPurchaseHistoryForUser("USU_1", NOW);

    const args = findManyArgs();
    expect(args.where).toEqual({
      buyerId: "USU_1",
      status: { in: ["CONFIRMED", "CANCELLED"] },
    });
    expect(args.orderBy).toEqual({ createdAt: "desc" });

    const select = findManySelect();
    expect(select).not.toHaveProperty("payments");
    expect(select).not.toHaveProperty("buyer");
    expect(select).not.toHaveProperty("seller");
    expect(select).not.toHaveProperty("contactEmail");
    expect(select).not.toHaveProperty("flight");
  });

  it("aísla el historial de dos usuarios distintos usando solo el argumento", async () => {
    prismaMock.booking.findMany.mockResolvedValue([] as never);

    await getPurchaseHistoryForUser("USU_1", NOW);
    const firstWhere = findManyArgs().where;

    await getPurchaseHistoryForUser("USU_2", NOW);
    const secondWhere = findManyArgs().where;

    expect(firstWhere).toEqual({
      buyerId: "USU_1",
      status: { in: ["CONFIRMED", "CANCELLED"] },
    });
    expect(secondWhere).toEqual({
      buyerId: "USU_2",
      status: { in: ["CONFIRMED", "CANCELLED"] },
    });
    expect(secondWhere).not.toEqual(firstWhere);
  });

  it("usa el vuelo actual del ticket, no el de la reserva, y conserva los datos del pasajero", async () => {
    const reprogrammed = flightRow({
      id: "VUE_NUEVO",
      code: "VU-20261106-02",
      departureAt: new Date("2026-11-06T09:00:00.000Z"),
      arrivalAt: new Date("2026-11-06T12:00:00.000Z"),
      route: {
        origin: { code: "COR", city: "Córdoba" },
        destination: { code: "SLA", city: "Salta" },
      },
    });
    prismaMock.booking.findMany.mockResolvedValue([
      bookingRow({
        flight: flightRow({ id: "VUE_ORIGINAL", code: "VU-ORIGINAL" }),
        tickets: [ticketRow({ flight: reprogrammed })],
      }),
    ] as never);

    const history = await getPurchaseHistoryForUser("USU_1", NOW);

    const [ticket] = history.upcoming[0].tickets;
    expect(ticket.flight).toEqual({
      id: "VUE_NUEVO",
      code: "VU-20261106-02",
      date: new Date("2026-11-05T00:00:00.000Z"),
      departureAt: new Date("2026-11-06T09:00:00.000Z"),
      arrivalAt: new Date("2026-11-06T12:00:00.000Z"),
      status: "SCHEDULED",
      origin: { code: "COR", city: "Córdoba" },
      destination: { code: "SLA", city: "Salta" },
    });
    expect(ticket).toMatchObject({
      id: "PAS_1",
      number: "ETK-ABC12345-1",
      seat: "12A",
      seatClass: "ECONOMY",
      status: "ISSUED",
      firstName: "Ana",
      lastName: "Pérez",
      documentType: "DNI",
      documentNumber: "30111222",
      issuedAt: new Date("2026-10-20T15:00:00.000Z"),
    });
    expect(history.upcoming[0]).not.toHaveProperty("flight");
  });

  it("mapea la factura y devuelve null cuando la compra no tiene factura", async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      bookingRow({ id: "RES_1", code: "ABC12345" }),
      bookingRow({
        id: "RES_2",
        code: "ABC12346",
        invoice: null,
        tickets: [ticketRow({ id: "PAS_2", contingencies: [] })],
      }),
    ] as never);

    const history = await getPurchaseHistoryForUser("USU_1", NOW);

    const withInvoice = history.upcoming.find((entry) => entry.id === "RES_1");
    const withoutInvoice = history.upcoming.find((entry) => entry.id === "RES_2");
    expect(withInvoice?.invoice).toEqual({
      id: "FAC_1",
      number: 7,
      issuedAt: new Date("2026-10-20T15:00:00.000Z"),
    });
    expect(withoutInvoice?.invoice).toBeNull();
  });

  it("aplana solo las contingencias pendientes con token, tipo, horarios y motivo", async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      bookingRow({
        tickets: [ticketRow({ contingencies: [contingencyRow()] })],
      }),
    ] as never);

    const history = await getPurchaseHistoryForUser("USU_1", NOW);

    expect(history.upcoming[0].pendingContingencies).toEqual([
      {
        ticketId: "PAS_1",
        accessToken: "tok_abc123",
        type: "SCHEDULE_CHANGE",
        previousDepartureAt: new Date("2026-10-28T10:00:00.000Z"),
        previousArrivalAt: new Date("2026-10-28T13:00:00.000Z"),
        newDepartureAt: new Date("2026-10-28T18:00:00.000Z"),
        newArrivalAt: new Date("2026-10-28T21:00:00.000Z"),
        reason: "Cambio operativo",
      },
    ]);

    const ticketsSelect = findManySelect().tickets as {
      select: { contingencies: { where: { resolution: string }; orderBy: unknown } };
    };
    expect(ticketsSelect.select.contingencies.where).toEqual({ resolution: "PENDING" });
    expect(ticketsSelect.select.contingencies.orderBy).toEqual({ createdAt: "asc" });
  });

  it("separa próximas y pasadas según estado del ticket, fecha del vuelo y estado de la compra", async () => {
    const pastDeparture = new Date("2026-10-01T10:00:00.000Z");
    prismaMock.booking.findMany.mockResolvedValue([
      bookingRow({
        id: "RES_FUTURA",
        code: "FUTU0001",
        tickets: [ticketRow({ id: "PAS_FUTURA" })],
      }),
      bookingRow({
        id: "RES_PASADA",
        code: "PASA0001",
        createdAt: new Date("2026-09-01T14:00:00.000Z"),
        tickets: [
          ticketRow({
            id: "PAS_PASADA",
            flight: flightRow({
              id: "VUE_PASADO",
              code: "VU-PASADO",
              departureAt: pastDeparture,
              arrivalAt: new Date("2026-10-01T13:00:00.000Z"),
            }),
          }),
        ],
      }),
      bookingRow({
        id: "RES_CANCELADA",
        code: "CANC0001",
        status: "CANCELLED",
        tickets: [ticketRow({ id: "PAS_CANCELADA", status: "CANCELLED" })],
      }),
      bookingRow({
        id: "RES_REEMBOLSADA",
        code: "REEM0001",
        status: "CANCELLED",
        tickets: [ticketRow({ id: "PAS_REEMBOLSADA", status: "REFUNDED" })],
      }),
    ] as never);

    const history = await getPurchaseHistoryForUser("USU_1", NOW);

    expect(history.upcoming.map((entry) => entry.id)).toEqual(["RES_FUTURA"]);
    expect(history.past.map((entry) => entry.id).sort()).toEqual(
      ["RES_CANCELADA", "RES_PASADA", "RES_REEMBOLSADA"].sort(),
    );
  });

  it("un ticket reembolsado no cuenta como vuelo futuro activo", async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      bookingRow({
        tickets: [ticketRow({ status: "REFUNDED" })],
      }),
    ] as never);

    const history = await getPurchaseHistoryForUser("USU_1", NOW);

    expect(history.upcoming).toEqual([]);
    expect(history.past.map((entry) => entry.id)).toEqual(["RES_1"]);
  });

  it("mantiene en próximas una compra con contingencia pendiente aunque el vuelo ya haya pasado", async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      bookingRow({
        tickets: [
          ticketRow({
            flight: flightRow({
              id: "VUE_VENCIDO",
              code: "VU-VENCIDO",
              departureAt: new Date("2026-09-15T10:00:00.000Z"),
              arrivalAt: new Date("2026-09-15T13:00:00.000Z"),
            }),
            contingencies: [contingencyRow()],
          }),
        ],
      }),
    ] as never);

    const history = await getPurchaseHistoryForUser("USU_1", NOW);

    expect(history.upcoming.map((entry) => entry.id)).toEqual(["RES_1"]);
    expect(history.past).toEqual([]);
  });

  it("ordena próximas por la menor salida futura y pasadas por la mayor salida", async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      bookingRow({
        id: "RES_FUTURA_TARDE",
        code: "FUTU0002",
        tickets: [
          ticketRow({
            id: "PAS_FT",
            flight: flightRow({
              id: "VUE_FT",
              code: "VU-FT",
              departureAt: new Date("2026-11-15T10:00:00.000Z"),
              arrivalAt: new Date("2026-11-15T13:00:00.000Z"),
            }),
          }),
        ],
      }),
      bookingRow({
        id: "RES_FUTURA_PRONTO",
        code: "FUTU0003",
        tickets: [
          ticketRow({
            id: "PAS_FP_2",
            flight: flightRow({
              id: "VUE_FP_2",
              code: "VU-FP-2",
              departureAt: new Date("2026-11-20T10:00:00.000Z"),
              arrivalAt: new Date("2026-11-20T13:00:00.000Z"),
            }),
          }),
          ticketRow({
            id: "PAS_FP_1",
            flight: flightRow({
              id: "VUE_FP_1",
              code: "VU-FP-1",
              departureAt: new Date("2026-11-03T10:00:00.000Z"),
              arrivalAt: new Date("2026-11-03T13:00:00.000Z"),
            }),
          }),
        ],
      }),
      bookingRow({
        id: "RES_PASADA_ANTIGUA",
        code: "PASA0002",
        createdAt: new Date("2026-08-01T14:00:00.000Z"),
        tickets: [
          ticketRow({
            id: "PAS_PA",
            flight: flightRow({
              id: "VUE_PA",
              code: "VU-PA",
              departureAt: new Date("2026-08-10T10:00:00.000Z"),
              arrivalAt: new Date("2026-08-10T13:00:00.000Z"),
            }),
          }),
        ],
      }),
      bookingRow({
        id: "RES_PASADA_RECIENTE",
        code: "PASA0003",
        createdAt: new Date("2026-09-01T14:00:00.000Z"),
        tickets: [
          ticketRow({
            id: "PAS_PR",
            flight: flightRow({
              id: "VUE_PR",
              code: "VU-PR",
              departureAt: new Date("2026-09-20T10:00:00.000Z"),
              arrivalAt: new Date("2026-09-20T13:00:00.000Z"),
            }),
          }),
        ],
      }),
    ] as never);

    const history = await getPurchaseHistoryForUser("USU_1", NOW);

    expect(history.upcoming.map((entry) => entry.id)).toEqual([
      "RES_FUTURA_PRONTO",
      "RES_FUTURA_TARDE",
    ]);
    expect(history.past.map((entry) => entry.id)).toEqual([
      "RES_PASADA_RECIENTE",
      "RES_PASADA_ANTIGUA",
    ]);
  });

  it("serializa el importe como string y no expone pagos, tarjeta ni datos de contacto", async () => {
    prismaMock.booking.findMany.mockResolvedValue([bookingRow()] as never);

    const history = await getPurchaseHistoryForUser("USU_1", NOW);

    const [entry] = history.upcoming;
    expect(typeof entry.totalAmount).toBe("string");
    expect(entry.totalAmount).toBe("135000");
    expect(Object.keys(entry).sort()).toEqual(
      [
        "code",
        "confirmedAt",
        "createdAt",
        "id",
        "invoice",
        "pendingContingencies",
        "quantity",
        "seatClass",
        "status",
        "tickets",
        "totalAmount",
      ].sort(),
    );
    expect(entry).not.toHaveProperty("payments");
    expect(entry).not.toHaveProperty("contactEmail");

    const serialized = JSON.stringify(history);
    expect(serialized).not.toContain("TX-ABCDEF123456");
    expect(serialized).not.toContain("4242");
    expect(serialized).not.toContain("cardLast4");
    expect(serialized).not.toContain("transactionId");
    expect(serialized).not.toContain("demo@volar.test");
    expect(serialized).not.toContain("mostrador@volar.test");
    expect(JSON.parse(serialized)).toMatchObject({
      upcoming: [{ id: "RES_1", totalAmount: "135000" }],
      past: [],
    });
  });
});
