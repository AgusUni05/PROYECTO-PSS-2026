import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import {
  BookingStatus,
  ContingencyResolution,
  RefundStatus,
  SeatClass,
  TicketStatus,
} from "@/generated/prisma/enums";
import { resolveRefund } from "./contingency-resolution";

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

    prismaMock.ticketContingency.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    prismaMock.ticketContingency.findUnique
      .mockResolvedValueOnce(makeContingency() as never)
      .mockResolvedValueOnce({
        resolution: ContingencyResolution.REFUND,
        resolvedAt,
      } as never);

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
