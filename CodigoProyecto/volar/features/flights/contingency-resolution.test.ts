import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import {
  BookingStatus,
  ContingencyResolution,
  EmailStatus,
  EmailType,
  RefundStatus,
  SeatClass,
  TicketStatus,
} from "@/generated/prisma/enums";
import { resolveRefund, resolveRebooking } from "./contingency-resolution";

const origin = { id: "AER_1", code: "EZE", city: "Buenos Aires", isActive: true };
const destination = { id: "AER_2", code: "MDZ", city: "Mendoza", isActive: true };
const route = {
  id: "TRA_1",
  code: "TR-001",
  originId: origin.id,
  destinationId: destination.id,
  operatingDays: ["THURSDAY"],
  departureTime: "08:30",
  arrivalTime: "10:00",
  isActive: true,
  origin,
  destination,
};

const flight = {
  id: "VUE_1",
  code: "VU-20261001-001",
  routeId: route.id,
  salesPeriodId: "PER_1",
  date: new Date("2026-10-01T00:00:00.000Z"),
  departureAt: new Date("2026-10-01T08:30:00.000Z"),
  arrivalAt: new Date("2026-10-01T10:00:00.000Z"),
  airplaneId: "AVI_1",
  economyCapacity: 150,
  firstClassCapacity: 16,
  economyOccupied: 8,
  firstClassOccupied: 4,
  economyFare: 45000,
  firstClassFare: 95000,
  status: "CANCELLED",
  route,
};

type BookingFixture = {
  id: string;
  code: string;
  flightId: string;
  seatClass: (typeof SeatClass)[keyof typeof SeatClass];
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: (typeof BookingStatus)[keyof typeof BookingStatus];
  holdExpiresAt: Date;
  channel: string;
  contactEmail: string;
  contactName: string;
  tickets?: TicketFixture[];
};

type TicketFixture = {
  id: string;
  bookingId: string;
  flightId: string;
  seatClass: (typeof SeatClass)[keyof typeof SeatClass];
  unitPrice: number;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  status: (typeof TicketStatus)[keyof typeof TicketStatus];
  booking: BookingFixture;
  flight: typeof flight;
};

const booking: BookingFixture = {
  id: "RES_1",
  code: "RES1A2B3",
  flightId: flight.id,
  seatClass: SeatClass.ECONOMY,
  quantity: 1,
  unitPrice: 45000,
  totalAmount: 45000,
  status: BookingStatus.CONFIRMED,
  holdExpiresAt: new Date("2026-09-30T12:00:00.000Z"),
  channel: "WEB",
  contactEmail: "juan@example.com",
  contactName: "Juan Pérez",
};

const ticket: TicketFixture = {
  id: "PAS_1",
  bookingId: booking.id,
  flightId: flight.id,
  seatClass: SeatClass.ECONOMY,
  unitPrice: 45000,
  firstName: "Juan",
  lastName: "Pérez",
  documentType: "DNI",
  documentNumber: "30123456",
  status: TicketStatus.ISSUED,
  booking,
  flight,
};

const flightChange = {
  id: "CVU_1",
  flightId: flight.id,
  type: "CANCELLATION",
  previousDepartureAt: new Date("2026-10-01T08:30:00.000Z"),
  previousArrivalAt: new Date("2026-10-01T10:00:00.000Z"),
  newDepartureAt: null,
  newArrivalAt: null,
  reason: "Condiciones meteorológicas",
  createdById: "USU_1",
};

function makeContingency(
  overrides: {
    resolution?: (typeof ContingencyResolution)[keyof typeof ContingencyResolution];
    resolvedAt?: Date | null;
    ticketOverride?: TicketFixture;
  } = {},
) {
  const t = overrides.ticketOverride ?? ticket;
  return {
    id: "CON_1",
    flightChangeId: flightChange.id,
    ticketId: t.id,
    accessToken: "tok-abc-123",
    resolution: overrides.resolution ?? ContingencyResolution.PENDING,
    newFlightId: null,
    resolvedAt: overrides.resolvedAt ?? null,
    createdAt: new Date("2026-09-25T10:00:00.000Z"),
    ticket: {
      ...t,
      booking: {
        ...t.booking,
        tickets: t.booking.tickets ?? [t],
      },
    },
    flightChange,
    newFlight: null,
  };
}

function fakeGateway(gatewayRefundId: string) {
  return {
    processRefund: vi.fn().mockResolvedValue({ gatewayRefundId }),
  };
}

beforeEach(() => {
  prismaMock.$transaction.mockImplementation(async (callback: unknown) => {
    if (typeof callback === "function") {
      return callback(prismaMock);
    }
    return Promise.all(callback as Promise<unknown>[]);
  });
});

describe("resolveRefund", () => {
  it("devuelve notFound cuando el token no existe", async () => {
    prismaMock.ticketContingency.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.ticketContingency.findUnique.mockResolvedValue(null);

    const result = await resolveRefund("token-inexistente", { gateway: fakeGateway("GW-1") });

    expect(result).toEqual({ type: "notFound" });
    expect(prismaMock.refund.create).not.toHaveBeenCalled();
  });

  it("reembolsa el importe exacto del ticket, marca REFUNDED, Refund COMPLETED, gatewayRefundId persistido, decrementa cupo y cancela la compra", async () => {
    prismaMock.ticketContingency.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.ticketContingency.findUnique.mockResolvedValue(makeContingency() as never);
    prismaMock.refund.create.mockResolvedValue({
      id: "REE_1",
      ticketId: ticket.id,
      amount: ticket.unitPrice,
      gatewayRefundId: "GW-123",
    } as never);
    prismaMock.ticket.update.mockResolvedValue({ ...ticket, status: TicketStatus.REFUNDED } as never);
    prismaMock.flight.update.mockResolvedValue(flight as never);
    prismaMock.booking.update.mockResolvedValue({ ...booking, status: BookingStatus.CANCELLED } as never);

    const gateway = fakeGateway("GW-123");
    const result = await resolveRefund("tok-abc-123", { gateway });

    expect(result.type).toBe("ok");
    if (result.type !== "ok") return;

    expect(result.amount).toBe(45000);
    expect(result.gatewayRefundId).toBe("GW-123");
    expect(result.ticketId).toBe(ticket.id);

    expect(prismaMock.ticketContingency.updateMany).toHaveBeenCalledWith({
      where: { accessToken: "tok-abc-123", resolution: ContingencyResolution.PENDING },
      data: { resolution: ContingencyResolution.REFUND, resolvedAt: expect.any(Date) },
    });

    expect(gateway.processRefund).toHaveBeenCalledWith({
      amount: 45000,
      ticketId: ticket.id,
      contingencyId: "CON_1",
    });

    expect(prismaMock.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ticketId: ticket.id,
        contingencyId: "CON_1",
        amount: ticket.unitPrice,
        status: RefundStatus.COMPLETED,
        gatewayRefundId: "GW-123",
        processedAt: expect.any(Date),
      }),
    });

    expect(prismaMock.ticket.update).toHaveBeenCalledWith({
      where: { id: ticket.id },
      data: { status: TicketStatus.REFUNDED },
    });

    expect(prismaMock.flight.update).toHaveBeenCalledWith({
      where: { id: flight.id },
      data: { economyOccupied: { decrement: 1 } },
    });

    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: { id: booking.id },
      data: { status: BookingStatus.CANCELLED },
    });

    // I1: los otros tokens PENDING del mismo ticket quedan resueltos igual.
    expect(prismaMock.ticketContingency.updateMany).toHaveBeenCalledWith({
      where: { ticketId: ticket.id, resolution: ContingencyResolution.PENDING },
      data: { resolution: ContingencyResolution.REFUND, resolvedAt: expect.any(Date) },
    });
  });

  it("un segundo token PENDING del mismo ticket no crea otro Refund ni libera cupo dos veces", async () => {
    const resolvedAt = new Date("2026-09-26T14:00:00.000Z");
    const gateway = fakeGateway("GW-SIBLING");

    prismaMock.ticketContingency.updateMany
      .mockResolvedValueOnce({ count: 1 }) // token A reserva la contingencia
      .mockResolvedValueOnce({ count: 1 }) // token A resuelve los siblings
      .mockResolvedValueOnce({ count: 0 }); // token B encuentra la fila ya resuelta
    prismaMock.ticketContingency.findUnique
      .mockResolvedValueOnce(makeContingency() as never)
      .mockResolvedValueOnce({
        resolution: ContingencyResolution.REFUND,
        resolvedAt,
      } as never);
    prismaMock.refund.create.mockResolvedValue({ id: "REE_SIBLING" } as never);
    prismaMock.ticket.update.mockResolvedValue({ ...ticket, status: TicketStatus.REFUNDED } as never);
    prismaMock.flight.update.mockResolvedValue(flight as never);
    prismaMock.booking.update.mockResolvedValue(booking as never);

    const first = await resolveRefund("tok-token-a", { gateway });
    const second = await resolveRefund("tok-token-b", { gateway });

    expect(first.type).toBe("ok");
    expect(second).toEqual({
      type: "alreadyResolved",
      resolution: "REFUND",
      resolvedAt,
    });
    expect(prismaMock.refund.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.ticket.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.flight.update).toHaveBeenCalledTimes(1);
    expect(gateway.processRefund).toHaveBeenCalledTimes(1);
  });

  it("no reembolsa un pasaje ya REFUNDED aunque su contingencia siga PENDING: revierte sin mutar nada", async () => {
    const refundedTicket: TicketFixture = {
      ...ticket,
      status: TicketStatus.REFUNDED,
      booking: { ...booking, tickets: [{ ...ticket, status: TicketStatus.REFUNDED }] },
    };
    const gateway = fakeGateway("GW-GUARD");

    prismaMock.ticketContingency.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.ticketContingency.findUnique.mockResolvedValue(
      makeContingency({ ticketOverride: refundedTicket }) as never,
    );

    const result = await resolveRefund("tok-abc-123", { gateway });

    expect(result).toEqual({ type: "conflict" });
    expect(gateway.processRefund).not.toHaveBeenCalled();
    expect(prismaMock.refund.create).not.toHaveBeenCalled();
    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
    expect(prismaMock.flight.update).not.toHaveBeenCalled();
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it("decrementa firstClassOccupied para pasajes de primera clase", async () => {
    const firstClassTicket: TicketFixture = { ...ticket, seatClass: SeatClass.FIRST, unitPrice: 95000 };
    const firstClassBooking: BookingFixture = {
      ...booking,
      seatClass: SeatClass.FIRST,
      unitPrice: 95000,
      totalAmount: 95000,
    };
    const firstClassTicketWithBooking: TicketFixture = { ...firstClassTicket, booking: firstClassBooking };

    prismaMock.ticketContingency.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.ticketContingency.findUnique.mockResolvedValue(
      makeContingency({ ticketOverride: firstClassTicketWithBooking }) as never,
    );
    prismaMock.refund.create.mockResolvedValue({ id: "REE_2" } as never);
    prismaMock.ticket.update.mockResolvedValue(firstClassTicketWithBooking as never);
    prismaMock.flight.update.mockResolvedValue(flight as never);
    prismaMock.booking.update.mockResolvedValue({ ...firstClassBooking, status: BookingStatus.CANCELLED } as never);

    await resolveRefund("tok-abc-123", { gateway: fakeGateway("GW-FIRST") });

    expect(prismaMock.flight.update).toHaveBeenCalledWith({
      where: { id: flight.id },
      data: { firstClassOccupied: { decrement: 1 } },
    });
  });

  it("no cancela la compra si quedan otros pasajes activos", async () => {
    const otherTicket: TicketFixture = { ...ticket, id: "PAS_2", status: TicketStatus.ISSUED };
    const ticketWithSiblings: TicketFixture = {
      ...ticket,
      booking: { ...booking, tickets: [ticket, otherTicket] },
    };

    prismaMock.ticketContingency.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.ticketContingency.findUnique.mockResolvedValue(
      makeContingency({ ticketOverride: ticketWithSiblings }) as never,
    );
    prismaMock.refund.create.mockResolvedValue({ id: "REE_3" } as never);
    prismaMock.ticket.update.mockResolvedValue(ticketWithSiblings as never);
    prismaMock.flight.update.mockResolvedValue(flight as never);

    await resolveRefund("tok-abc-123", { gateway: fakeGateway("GW-SIB") });

    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it("devuelve alreadyResolved sin crear un segundo reembolso", async () => {
    const resolvedAt = new Date("2026-09-26T14:00:00.000Z");
    prismaMock.ticketContingency.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.ticketContingency.findUnique.mockResolvedValue({
      resolution: ContingencyResolution.REFUND,
      resolvedAt,
    } as never);

    const result = await resolveRefund("tok-abc-123", { gateway: fakeGateway("GW-DUP") });

    expect(result).toEqual({
      type: "alreadyResolved",
      resolution: "REFUND",
      resolvedAt,
    });
    expect(prismaMock.refund.create).not.toHaveBeenCalled();
    expect(prismaMock.flight.update).not.toHaveBeenCalled();
  });

  it("devuelve conflict cuando el pasaje ya fue reprogramado", async () => {
    prismaMock.ticketContingency.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.ticketContingency.findUnique.mockResolvedValue({
      resolution: ContingencyResolution.REBOOK,
      resolvedAt: new Date("2026-09-26T15:00:00.000Z"),
    } as never);

    const result = await resolveRefund("tok-abc-123", { gateway: fakeGateway("GW-REBOOK") });

    expect(result).toEqual({ type: "conflict" });
    expect(prismaMock.refund.create).not.toHaveBeenCalled();
  });

  it("dos solicitudes concurrentes no generan dos reembolsos", async () => {
    // Nota: este proyecto no tiene suite de integración contra DB real; el
    // test mockea la secuencia en que la primera solicitud reserva la fila
    // (updateMany count=1) y la segunda la encuentra ya resuelta
    // (updateMany count=0). En producción el aislamiento real lo garantiza el
    // bloqueo de fila de PostgreSQL adquirido por el updateMany condicional
    // dentro de prisma.$transaction.
    const resolvedAt = new Date("2026-09-26T14:00:00.000Z");
    const gateway = fakeGateway("GW-RACE");

    let resolution: (typeof ContingencyResolution)[keyof typeof ContingencyResolution] =
      ContingencyResolution.PENDING;
    let resolvedAtValue: Date | null = null;

    prismaMock.ticketContingency.updateMany.mockImplementation((async () => {
      if (resolution !== ContingencyResolution.PENDING) return { count: 0 };
      resolution = ContingencyResolution.REFUND;
      resolvedAtValue = resolvedAt;
      return { count: 1 };
    }) as never);
    prismaMock.ticketContingency.findUnique.mockImplementation((async () =>
      makeContingency({ resolution, resolvedAt: resolvedAtValue }) as never) as never);

    prismaMock.refund.create.mockResolvedValue({ id: "REE_RACE" } as never);
    prismaMock.ticket.update.mockResolvedValue(ticket as never);
    prismaMock.flight.update.mockResolvedValue(flight as never);
    prismaMock.booking.update.mockResolvedValue(booking as never);

    const [first, second] = await Promise.all([
      resolveRefund("tok-abc-123", { gateway }),
      resolveRefund("tok-abc-123", { gateway }),
    ]);

    expect(first.type).toBe("ok");
    expect(second).toEqual({
      type: "alreadyResolved",
      resolution: "REFUND",
      resolvedAt,
    });
    expect(prismaMock.refund.create).toHaveBeenCalledTimes(1);
  });
});

// US-26: reprogramación sin cargo a un vuelo futuro de la misma ruta y clase.
const rebookingFlight = {
  id: "VUE_2",
  code: "VU-20300104-001",
  date: new Date("2030-01-04T00:00:00.000Z"),
  departureAt: new Date("2030-01-04T08:30:00.000Z"),
  arrivalAt: new Date("2030-01-04T10:00:00.000Z"),
  economyCapacity: 150,
  economyOccupied: 10,
  firstClassCapacity: 16,
  firstClassOccupied: 4,
  status: "SCHEDULED",
};

function makeRebookingContingency(
  overrides: {
    resolution?: (typeof ContingencyResolution)[keyof typeof ContingencyResolution];
    resolvedAt?: Date | null;
    ticketOverride?: TicketFixture;
  } = {},
) {
  const t = overrides.ticketOverride ?? ticket;
  return {
    id: "CON_1",
    flightChangeId: flightChange.id,
    ticketId: t.id,
    accessToken: "tok-abc-123",
    resolution: overrides.resolution ?? ContingencyResolution.PENDING,
    newFlightId: null,
    resolvedAt: overrides.resolvedAt ?? null,
    createdAt: new Date("2026-09-25T10:00:00.000Z"),
    ticket: {
      ...t,
      flight: { id: flight.id, routeId: route.id },
      booking: {
        ...booking,
        tickets: [{ id: t.id }],
      },
    },
    flightChange,
    newFlight: null,
  };
}

function mockSuccessfulRebooking(contingency = makeRebookingContingency()) {
  prismaMock.ticketContingency.findUnique.mockResolvedValue(contingency as never);
  prismaMock.flight.findFirst.mockResolvedValue(rebookingFlight as never);
  prismaMock.flight.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.ticketContingency.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.flight.update.mockResolvedValue(flight as never);
  prismaMock.ticket.findMany.mockResolvedValue([{ seat: "1A" }] as never);
  prismaMock.ticket.update.mockResolvedValue(ticket as never);
  prismaMock.emailNotification.create.mockResolvedValue({ id: "NOT_1" } as never);
}

describe("resolveRebooking", () => {
  it("reprograma el pasaje a un vuelo elegible conservando clase e importe, mueve el cupo, actualiza el asiento/número y encola el correo", async () => {
    mockSuccessfulRebooking();

    const result = await resolveRebooking(
      "tok-abc-123",
      rebookingFlight.id,
      { now: new Date("2026-09-26T12:00:00.000Z") },
    );

    expect(result.type).toBe("ok");
    if (result.type !== "ok") return;

    expect(result.ticketId).toBe(ticket.id);
    expect(result.newFlightId).toBe(rebookingFlight.id);
    expect(result.flightCode).toBe(rebookingFlight.code);
    expect(result.seat).toBe("1B");
    expect(result.ticketNumber).toBe("ETK-RES1A2B3-1-R1");
    expect(result.resolvedAt).toEqual(new Date("2026-09-26T12:00:00.000Z"));

    // El vuelo enviado por el cliente solo se acepta si cumple el criterio.
    expect(prismaMock.flight.findFirst).toHaveBeenCalledWith({
      where: {
        routeId: route.id,
        id: { equals: rebookingFlight.id, not: flight.id },
        status: "SCHEDULED",
        departureAt: { gt: new Date("2026-09-26T12:00:00.000Z") },
      },
      select: expect.any(Object),
    });

    // El cupo nuevo se toma de forma condicional (race-safe).
    expect(prismaMock.flight.updateMany).toHaveBeenCalledWith({
      where: {
        id: rebookingFlight.id,
        status: "SCHEDULED",
        departureAt: { gt: new Date("2026-09-26T12:00:00.000Z") },
        economyOccupied: { lt: rebookingFlight.economyCapacity },
      },
      data: { economyOccupied: { increment: 1 } },
    });

    expect(prismaMock.ticketContingency.updateMany).toHaveBeenCalledWith({
      where: { accessToken: "tok-abc-123", resolution: ContingencyResolution.PENDING },
      data: {
        resolution: ContingencyResolution.REBOOK,
        newFlightId: rebookingFlight.id,
        resolvedAt: new Date("2026-09-26T12:00:00.000Z"),
      },
    });

    // I1: los siblings del mismo ticket quedan resueltos como REBOOK.
    expect(prismaMock.ticketContingency.updateMany).toHaveBeenCalledWith({
      where: { ticketId: ticket.id, resolution: ContingencyResolution.PENDING },
      data: {
        resolution: ContingencyResolution.REBOOK,
        resolvedAt: new Date("2026-09-26T12:00:00.000Z"),
      },
    });

    // El asiento anterior queda libre al mover el pasaje y bajar la ocupación.
    expect(prismaMock.flight.update).toHaveBeenCalledWith({
      where: { id: flight.id },
      data: { economyOccupied: { decrement: 1 } },
    });

    expect(prismaMock.ticket.findMany).toHaveBeenCalledWith({
      where: { flightId: rebookingFlight.id, seatClass: SeatClass.ECONOMY, seat: { not: null } },
      select: { seat: true },
      distinct: ["seat"],
    });

    expect(prismaMock.ticket.update).toHaveBeenCalledWith({
      where: { id: ticket.id },
      data: {
        flightId: rebookingFlight.id,
        seat: "1B",
        number: "ETK-RES1A2B3-1-R1",
        issuedAt: new Date("2026-09-26T12:00:00.000Z"),
      },
    });

    const ticketUpdateData = prismaMock.ticket.update.mock.calls[0][0].data as Record<string, unknown>;
    expect(ticketUpdateData).not.toHaveProperty("unitPrice");
    expect(ticketUpdateData).not.toHaveProperty("seatClass");

    const email = prismaMock.emailNotification.create.mock.calls[0][0].data as Record<string, unknown>;
    expect(email).toMatchObject({
      type: EmailType.REBOOKING_CONFIRMATION,
      recipientEmail: booking.contactEmail,
      bookingId: booking.id,
      status: EmailStatus.FAILED,
      attempts: 0,
      lastError: "No hay plantilla de confirmación de reprogramación en Sprint 3",
    });
    expect(String(email.subject)).toContain(rebookingFlight.code);
    expect(String(email.subject)).toContain(booking.code);

    // No se crea una venta, un pago, un reembolso ni una factura nuevos.
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
    expect(prismaMock.refund.create).not.toHaveBeenCalled();
    expect(prismaMock.invoice.create).not.toHaveBeenCalled();
  });

  it("rechaza un vuelo de otra ruta y no muta el pasaje ni la contingencia", async () => {
    prismaMock.ticketContingency.findUnique.mockResolvedValue(
      makeRebookingContingency() as never,
    );
    // La query filtra por routeId: un vuelo de otra ruta no se encuentra.
    prismaMock.flight.findFirst.mockResolvedValue(null);
    prismaMock.ticketContingency.updateMany.mockResolvedValue({ count: 1 });

    const result = await resolveRebooking("tok-abc-123", "VUE_OTRA_RUTA");

    expect(result).toEqual({ type: "conflict", reason: "FLIGHT_NOT_ELIGIBLE" });
    expect(prismaMock.flight.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ routeId: route.id }),
      }),
    );
    // La contingencia se reservó primero (orden de locks); la transacción se
    // revierte y no se mueve cupo, pasaje ni correo.
    expect(prismaMock.ticketContingency.updateMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.flight.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
    expect(prismaMock.emailNotification.create).not.toHaveBeenCalled();
  });

  it("rechaza un vuelo cancelado o ya partido aunque la página lo haya mostrado antes", async () => {
    prismaMock.ticketContingency.findUnique.mockResolvedValue(
      makeRebookingContingency() as never,
    );
    prismaMock.flight.findFirst.mockResolvedValue(null);
    prismaMock.ticketContingency.updateMany.mockResolvedValue({ count: 1 });

    const result = await resolveRebooking("tok-abc-123", "VUE_CANCELADO");

    expect(result).toEqual({ type: "conflict", reason: "FLIGHT_NOT_ELIGIBLE" });
    expect(prismaMock.flight.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "SCHEDULED",
          departureAt: { gt: expect.any(Date) },
        }),
      }),
    );
    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
  });

  it("rechaza la clase agotada sin mutaciones parciales", async () => {
    prismaMock.ticketContingency.findUnique.mockResolvedValue(
      makeRebookingContingency() as never,
    );
    prismaMock.flight.findFirst.mockResolvedValue({
      ...rebookingFlight,
      economyOccupied: rebookingFlight.economyCapacity,
      firstClassOccupied: 0,
    } as never);
    prismaMock.ticketContingency.updateMany.mockResolvedValue({ count: 1 });

    const result = await resolveRebooking("tok-abc-123", rebookingFlight.id);

    expect(result).toEqual({ type: "conflict", reason: "NO_CAPACITY" });
    expect(prismaMock.flight.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.ticketContingency.updateMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.flight.update).not.toHaveBeenCalled();
    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
    expect(prismaMock.emailNotification.create).not.toHaveBeenCalled();
  });

  it("rechaza el cupo perdido entre la lectura y la reserva (updateMany condicional en 0)", async () => {
    prismaMock.ticketContingency.findUnique.mockResolvedValue(
      makeRebookingContingency() as never,
    );
    prismaMock.flight.findFirst.mockResolvedValue(rebookingFlight as never);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.ticketContingency.updateMany.mockResolvedValue({ count: 1 });

    const result = await resolveRebooking("tok-abc-123", rebookingFlight.id);

    expect(result).toEqual({ type: "conflict", reason: "NO_CAPACITY" });
    expect(prismaMock.ticketContingency.updateMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
    expect(prismaMock.emailNotification.create).not.toHaveBeenCalled();
  });

  it("no reprograma un pasaje ya reembolsado aunque su token siga PENDING: revierte y devuelve conflict", async () => {
    const refundedTicket: TicketFixture = {
      ...ticket,
      status: TicketStatus.REFUNDED,
      booking: { ...booking, tickets: [{ ...ticket, status: TicketStatus.REFUNDED }] },
    };

    prismaMock.ticketContingency.findUnique.mockResolvedValue(
      makeRebookingContingency({ ticketOverride: refundedTicket }) as never,
    );
    prismaMock.ticketContingency.updateMany.mockResolvedValue({ count: 1 });

    const result = await resolveRebooking("tok-abc-123", rebookingFlight.id);

    expect(result).toEqual({ type: "conflict", reason: "TICKET_NOT_ACTIVE" });
    // El guard ocurre antes de tocar el vuelo nuevo o el pasaje.
    expect(prismaMock.flight.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.flight.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.flight.update).not.toHaveBeenCalled();
    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
    expect(prismaMock.emailNotification.create).not.toHaveBeenCalled();
  });

  it("usa el cupo de primera clase y conserva la clase del ticket", async () => {
    const firstClassTicket: TicketFixture = {
      ...ticket,
      seatClass: SeatClass.FIRST,
      unitPrice: 95000,
    };

    mockSuccessfulRebooking(
      makeRebookingContingency({ ticketOverride: firstClassTicket }),
    );
    prismaMock.ticket.findMany.mockResolvedValue([
      { seat: "1A" },
      { seat: "1B" },
      { seat: "1C" },
      { seat: "1D" },
      { seat: "2A" },
    ] as never);

    const result = await resolveRebooking("tok-abc-123", rebookingFlight.id);

    expect(result.type).toBe("ok");
    if (result.type !== "ok") return;
    expect(result.seat).toBe("2B");

    expect(prismaMock.flight.updateMany).toHaveBeenCalledWith({
      where: {
        id: rebookingFlight.id,
        status: "SCHEDULED",
        departureAt: { gt: expect.any(Date) },
        firstClassOccupied: { lt: rebookingFlight.firstClassCapacity },
      },
      data: { firstClassOccupied: { increment: 1 } },
    });
    expect(prismaMock.flight.update).toHaveBeenCalledWith({
      where: { id: flight.id },
      data: { firstClassOccupied: { decrement: 1 } },
    });

    const data = prismaMock.ticket.update.mock.calls[0][0].data as Record<string, unknown>;
    expect(data).not.toHaveProperty("seatClass");
  });

  it("devuelve notFound cuando el token no existe", async () => {
    prismaMock.ticketContingency.findUnique.mockResolvedValue(null);

    const result = await resolveRebooking("token-inexistente", rebookingFlight.id);

    expect(result).toEqual({ type: "notFound" });
    expect(prismaMock.flight.findFirst).not.toHaveBeenCalled();
  });

  it("devuelve alreadyResolved para un token ya reembolsado sin crear otro cambio ni correo", async () => {
    const resolvedAt = new Date("2026-09-26T14:00:00.000Z");
    prismaMock.ticketContingency.findUnique.mockResolvedValue(
      makeRebookingContingency({
        resolution: ContingencyResolution.REFUND,
        resolvedAt,
      }) as never,
    );

    const result = await resolveRebooking("tok-abc-123", rebookingFlight.id);

    expect(result).toEqual({
      type: "alreadyResolved",
      resolution: "REFUND",
      resolvedAt,
    });
    expect(prismaMock.flight.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
    expect(prismaMock.emailNotification.create).not.toHaveBeenCalled();
  });

  it("una segunda resolución no genera otro cambio de vuelo ni otro correo", async () => {
    // Nota: la suite mockea Prisma; el aislamiento real entre solicitudes
    // concurrentes depende del bloqueo de fila de PostgreSQL que adquiere el
    // updateMany condicionado a `resolution: PENDING` dentro de la transacción.
    let resolution: (typeof ContingencyResolution)[keyof typeof ContingencyResolution] =
      ContingencyResolution.PENDING;
    let resolvedAt: Date | null = null;

    prismaMock.ticketContingency.findUnique.mockImplementation((async () =>
      makeRebookingContingency({ resolution, resolvedAt }) as never) as never);
    prismaMock.flight.findFirst.mockResolvedValue(rebookingFlight as never);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.ticketContingency.updateMany.mockImplementation((async () => {
      if (resolution !== ContingencyResolution.PENDING) return { count: 0 };
      resolution = ContingencyResolution.REBOOK;
      resolvedAt = new Date("2026-09-26T15:00:00.000Z");
      return { count: 1 };
    }) as never);
    prismaMock.flight.update.mockResolvedValue(flight as never);
    prismaMock.ticket.findMany.mockResolvedValue([] as never);
    prismaMock.ticket.update.mockResolvedValue(ticket as never);
    prismaMock.emailNotification.create.mockResolvedValue({ id: "NOT_1" } as never);

    const first = await resolveRebooking("tok-abc-123", rebookingFlight.id);
    const second = await resolveRebooking("tok-abc-123", rebookingFlight.id);

    expect(first.type).toBe("ok");
    expect(second).toEqual({
      type: "alreadyResolved",
      resolution: "REBOOK",
      resolvedAt: new Date("2026-09-26T15:00:00.000Z"),
    });
    expect(prismaMock.ticket.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.emailNotification.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.flight.updateMany).toHaveBeenCalledTimes(1);
  });

  it("si otra solicitud reserva la contingencia primero, devuelve alreadyResolved sin tocar el pasaje", async () => {
    const resolvedAt = new Date("2026-09-26T15:00:00.000Z");
    prismaMock.ticketContingency.findUnique
      .mockResolvedValueOnce(makeRebookingContingency() as never)
      .mockResolvedValueOnce({
        resolution: ContingencyResolution.REBOOK,
        resolvedAt,
      } as never);
    prismaMock.flight.findFirst.mockResolvedValue(rebookingFlight as never);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.ticketContingency.updateMany.mockResolvedValue({ count: 0 });

    const result = await resolveRebooking("tok-abc-123", rebookingFlight.id);

    expect(result).toEqual({
      type: "alreadyResolved",
      resolution: "REBOOK",
      resolvedAt,
    });
    expect(prismaMock.flight.update).not.toHaveBeenCalled();
    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
    expect(prismaMock.emailNotification.create).not.toHaveBeenCalled();
  });
});
