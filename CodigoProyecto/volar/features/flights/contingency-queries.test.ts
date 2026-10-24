import { describe, expect, it } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { getContingencyByToken, getRebookingAlternatives } from "./contingency-queries";

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
const booking = {
  id: "RES_1",
  code: "RES1A2B3",
  flightId: flight.id,
  seatClass: "ECONOMY",
  quantity: 1,
  unitPrice: 45000,
  totalAmount: 45000,
  status: "CONFIRMED",
  holdExpiresAt: new Date("2026-09-30T12:00:00.000Z"),
  channel: "WEB",
  contactEmail: "juan@example.com",
  contactName: "Juan Pérez",
};
const ticket = {
  id: "PAS_1",
  bookingId: booking.id,
  flightId: flight.id,
  seatClass: "ECONOMY",
  unitPrice: 45000,
  firstName: "Juan",
  lastName: "Pérez",
  documentType: "DNI",
  documentNumber: "30123456",
  status: "ISSUED",
  booking,
  flight,
};
const flightChange: {
  id: string;
  flightId: string;
  type: string;
  previousDepartureAt: Date;
  previousArrivalAt: Date;
  newDepartureAt: Date | null;
  newArrivalAt: Date | null;
  reason: string;
  createdById: string;
} = {
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
    resolution?: "PENDING" | "REFUND" | "REBOOK";
    resolvedAt?: Date | null;
    flightChangeOverride?: typeof flightChange;
  } = {},
) {
  return {
    id: "CON_1",
    flightChangeId: flightChange.id,
    ticketId: ticket.id,
    accessToken: "tok-abc-123",
    resolution: overrides.resolution ?? "PENDING",
    newFlightId: null,
    resolvedAt: overrides.resolvedAt ?? null,
    createdAt: new Date("2026-09-25T10:00:00.000Z"),
    ticket,
    flightChange: overrides.flightChangeOverride ?? flightChange,
    newFlight: null,
  };
}

// US-26: consulta pública de contingencia mediante token de acceso limitado.
describe("getContingencyByToken", () => {
  it("devuelve null cuando el token no existe", async () => {
    prismaMock.ticketContingency.findUnique.mockResolvedValue(null);

    const result = await getContingencyByToken("token-inexistente");

    expect(result).toBeNull();
    expect(prismaMock.ticketContingency.findUnique).toHaveBeenCalledWith({
      where: { accessToken: "token-inexistente" },
      include: expect.any(Object),
    });
  });

  it("devuelve la contingencia pendiente con los datos mínimos del pasaje, vuelo, ruta, clase e importe", async () => {
    prismaMock.ticketContingency.findUnique.mockResolvedValue(makeContingency() as never);

    const result = await getContingencyByToken("tok-abc-123");

    expect(result).not.toBeNull();
    expect(result?.status).toBe("PENDING");
    if (result?.status !== "PENDING") return;

    expect(result.token).toBe("tok-abc-123");
    expect(result.changeType).toBe("CANCELLATION");

    expect(result.passenger).toEqual({
      firstName: "Juan",
      lastName: "Pérez",
      documentNumber: "30123456",
    });

    expect(result.ticket.id).toBe("PAS_1");
    expect(result.ticket.seatClass).toBe("ECONOMY");
    expect(result.ticket.unitPrice).toBe(45000);

    expect(result.flight.code).toBe("VU-20261001-001");
    expect(result.flight.date).toEqual(new Date("2026-10-01T00:00:00.000Z"));
    expect(result.flight.origin).toEqual({ code: "EZE", city: "Buenos Aires" });
    expect(result.flight.destination).toEqual({ code: "MDZ", city: "Mendoza" });
    expect(result.flight.departureAt).toEqual(new Date("2026-10-01T08:30:00.000Z"));
    expect(result.flight.arrivalAt).toEqual(new Date("2026-10-01T10:00:00.000Z"));

    expect(result.previousDepartureAt).toEqual(new Date("2026-10-01T08:30:00.000Z"));
    expect(result.previousArrivalAt).toEqual(new Date("2026-10-01T10:00:00.000Z"));
    expect(result.newDepartureAt).toBeNull();
    expect(result.newArrivalAt).toBeNull();
  });

  it("devuelve los horarios anterior y nuevo para un cambio de horario", async () => {
    const scheduleChange = {
      ...flightChange,
      type: "SCHEDULE_CHANGE",
      newDepartureAt: new Date("2026-10-01T09:00:00.000Z"),
      newArrivalAt: new Date("2026-10-01T10:30:00.000Z"),
    };
    prismaMock.ticketContingency.findUnique.mockResolvedValue(
      makeContingency({ resolution: "PENDING", flightChangeOverride: scheduleChange }) as never,
    );

    const result = await getContingencyByToken("tok-abc-123");

    expect(result?.status).toBe("PENDING");
    if (result?.status !== "PENDING") return;
    expect(result.changeType).toBe("SCHEDULE_CHANGE");
    expect(result.previousDepartureAt).toEqual(scheduleChange.previousDepartureAt);
    expect(result.previousArrivalAt).toEqual(scheduleChange.previousArrivalAt);
    expect(result.newDepartureAt).toEqual(scheduleChange.newDepartureAt);
    expect(result.newArrivalAt).toEqual(scheduleChange.newArrivalAt);
  });

  it("devuelve estado final sin datos sensibles cuando el token ya fue resuelto como reembolso", async () => {
    const resolvedAt = new Date("2026-09-26T14:00:00.000Z");
    prismaMock.ticketContingency.findUnique.mockResolvedValue(
      makeContingency({ resolution: "REFUND", resolvedAt }) as never,
    );

    const result = await getContingencyByToken("tok-abc-123");

    expect(result).toEqual({
      status: "REFUND",
      resolution: "REFUND",
      resolvedAt,
    });
  });

  it("devuelve estado final sin datos sensibles cuando el token ya fue resuelto como reprogramación", async () => {
    const resolvedAt = new Date("2026-09-26T15:00:00.000Z");
    prismaMock.ticketContingency.findUnique.mockResolvedValue(
      makeContingency({ resolution: "REBOOK", resolvedAt }) as never,
    );

    const result = await getContingencyByToken("tok-abc-123");

    expect(result).toEqual({
      status: "REBOOK",
      resolution: "REBOOK",
      resolvedAt,
    });
  });

  it("no expone información de otra contingencia: cada token consulta su propia fila", async () => {
    // Nota: este proyecto usa Prisma mockeado en unit tests; no hay suite de
    // integración contra DB real. Simulamos dos filas distintas para verificar
    // que la función pasa el token correcto al WHERE y devuelve solo la fila
    // solicitada. En producción el índice único de `accessToken` garantiza la
    // imposibilidad de cruzar datos entre tokens.
    prismaMock.ticketContingency.findUnique.mockImplementation(
      (async (args: { where: { accessToken: string } }) => {
        const token = args.where.accessToken;
        if (token === "tok-abc-123") return makeContingency() as never;
        if (token === "tok-xyz-999") {
          return { ...makeContingency(), id: "CON_2", accessToken: "tok-xyz-999" } as never;
        }
        return null as never;
      }) as never,
    );

    const resultA = await getContingencyByToken("tok-abc-123");
    const resultB = await getContingencyByToken("tok-xyz-999");

    expect(resultA?.status).toBe("PENDING");
    expect(resultB?.status).toBe("PENDING");
    expect(prismaMock.ticketContingency.findUnique).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { accessToken: "tok-abc-123" } }),
    );
    expect(prismaMock.ticketContingency.findUnique).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { accessToken: "tok-xyz-999" } }),
    );
  });

  it("funciona sin sesión de Clerk: el token es el único secreto de acceso", async () => {
    prismaMock.ticketContingency.findUnique.mockResolvedValue(makeContingency() as never);

    const result = await getContingencyByToken("tok-abc-123");

    expect(result?.status).toBe("PENDING");
  });
});

// US-26: alternativas de reprogramación para un pasaje afectado. El token es
// el único dato de entrada; la ruta y la clase salen del ticket de la
// contingencia, nunca de parámetros enviados por el cliente.
function makeRebookingContext(
  overrides: {
    resolution?: "PENDING" | "REFUND" | "REBOOK";
    seatClass?: "ECONOMY" | "FIRST";
    routeId?: string;
    flightId?: string;
  } = {},
) {
  return {
    resolution: overrides.resolution ?? "PENDING",
    ticket: {
      flightId: overrides.flightId ?? flight.id,
      seatClass: overrides.seatClass ?? "ECONOMY",
      flight: { routeId: overrides.routeId ?? route.id },
    },
  };
}

const alternativeFlight = {
  id: "VUE_2",
  code: "VU-20300104-001",
  date: new Date("2030-01-04T00:00:00.000Z"),
  departureAt: new Date("2030-01-04T08:30:00.000Z"),
  arrivalAt: new Date("2030-01-04T10:00:00.000Z"),
  economyCapacity: 150,
  economyOccupied: 10,
  firstClassCapacity: 16,
  firstClassOccupied: 16,
};

const secondAlternativeFlight = {
  id: "VUE_3",
  code: "VU-20300105-001",
  date: new Date("2030-01-05T00:00:00.000Z"),
  departureAt: new Date("2030-01-05T08:30:00.000Z"),
  arrivalAt: new Date("2030-01-05T10:00:00.000Z"),
  economyCapacity: 150,
  economyOccupied: 0,
  firstClassCapacity: 16,
  firstClassOccupied: 16,
};

describe("getRebookingAlternatives", () => {
  it("devuelve solo vuelos de la misma ruta, programados, futuros, distintos del original y con cupo en la clase del ticket, ordenados por partida", async () => {
    prismaMock.ticketContingency.findUnique.mockResolvedValue(makeRebookingContext() as never);
    prismaMock.flight.findMany.mockResolvedValue([
      alternativeFlight,
      secondAlternativeFlight,
    ] as never);

    const result = await getRebookingAlternatives("tok-abc-123");

    expect(result).toEqual([
      {
        id: "VUE_2",
        code: "VU-20300104-001",
        date: alternativeFlight.date,
        departureAt: alternativeFlight.departureAt,
        arrivalAt: alternativeFlight.arrivalAt,
        availableSeats: 140,
      },
      {
        id: "VUE_3",
        code: "VU-20300105-001",
        date: secondAlternativeFlight.date,
        departureAt: secondAlternativeFlight.departureAt,
        arrivalAt: secondAlternativeFlight.arrivalAt,
        availableSeats: 150,
      },
    ]);

    expect(prismaMock.ticketContingency.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { accessToken: "tok-abc-123" } }),
    );
    expect(prismaMock.flight.findMany).toHaveBeenCalledWith({
      where: {
        routeId: route.id,
        id: { not: flight.id },
        status: "SCHEDULED",
        departureAt: { gt: expect.any(Date) },
      },
      orderBy: { departureAt: "asc" },
      select: expect.any(Object),
    });
  });

  it("no devuelve vuelos cuando la clase del ticket está agotada aunque la otra clase tenga cupo", async () => {
    prismaMock.ticketContingency.findUnique.mockResolvedValue(makeRebookingContext() as never);
    prismaMock.flight.findMany.mockResolvedValue([
      {
        ...alternativeFlight,
        economyCapacity: 150,
        economyOccupied: 150,
        firstClassCapacity: 16,
        firstClassOccupied: 0,
      },
    ] as never);

    const result = await getRebookingAlternatives("tok-abc-123");

    expect(result).toEqual([]);
  });

  it("usa la capacidad de primera clase cuando el ticket es de primera clase", async () => {
    prismaMock.ticketContingency.findUnique.mockResolvedValue(
      makeRebookingContext({ seatClass: "FIRST" }) as never,
    );
    prismaMock.flight.findMany.mockResolvedValue([
      {
        ...alternativeFlight,
        economyCapacity: 150,
        economyOccupied: 150,
        firstClassCapacity: 16,
        firstClassOccupied: 4,
      },
    ] as never);

    const result = await getRebookingAlternatives("tok-abc-123");

    expect(result).toHaveLength(1);
    expect(result?.[0].availableSeats).toBe(12);
  });

  it("devuelve null para un token inexistente y no consulta vuelos", async () => {
    prismaMock.ticketContingency.findUnique.mockResolvedValue(null);

    const result = await getRebookingAlternatives("token-inexistente");

    expect(result).toBeNull();
    expect(prismaMock.flight.findMany).not.toHaveBeenCalled();
  });

  it("devuelve null para un token ya resuelto y no expone datos de la contingencia", async () => {
    prismaMock.ticketContingency.findUnique.mockResolvedValue(
      makeRebookingContext({ resolution: "REFUND" }) as never,
    );

    const result = await getRebookingAlternatives("tok-abc-123");

    expect(result).toBeNull();
    expect(prismaMock.flight.findMany).not.toHaveBeenCalled();
  });
});
