import { describe, expect, it, beforeEach } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { cancelFlight, cancelFlightsByRoute, generateFlights, updateFlight } from "./service";
import { CANCELLATION_REASON_LABELS, type GenerateFlightsFormValues } from "./schema";

const route = {
  id: "TRA_1",
  code: "TR-001",
  originId: "AER_1",
  destinationId: "AER_2",
  operatingDays: ["THURSDAY"],
  departureTime: "08:30",
  arrivalTime: "10:00",
  isActive: true,
};

const airplane = {
  id: "AVI_1",
  identifier: "LV-ARG01",
  model: "Boeing 737-800",
  economySeats: 150,
  firstClassSeats: 16,
  isActive: true,
};

// 2026-10-01 es jueves (único jueves del rango).
const formValues: GenerateFlightsFormValues = {
  routeId: route.id,
  airplaneId: airplane.id,
  startDate: "2026-10-01",
  endDate: "2026-10-01",
  economyCapacity: 150,
  firstClassCapacity: 16,
  economyFare: 45000,
  firstClassFare: 95000,
};

beforeEach(() => {
  prismaMock.$transaction.mockImplementation(async (callback: unknown) => {
    if (typeof callback === "function") {
      return callback(prismaMock);
    }
    return Promise.all(callback as Promise<unknown>[]);
  });
});

describe("generateFlights", () => {
  it("rechaza si el trayecto no existe", async () => {
    prismaMock.route.findUnique.mockResolvedValue(null);

    const result = await generateFlights(formValues, "USU_admin");

    expect(result.ok).toBe(false);
    expect(prismaMock.airplane.findUnique).not.toHaveBeenCalled();
  });

  it("rechaza si el trayecto está inactivo", async () => {
    prismaMock.route.findUnique.mockResolvedValue({ ...route, isActive: false } as never);

    const result = await generateFlights(formValues, "USU_admin");

    expect(result.ok).toBe(false);
  });

  it("rechaza si el avión no existe o está inactivo", async () => {
    prismaMock.route.findUnique.mockResolvedValue(route as never);
    prismaMock.airplane.findUnique.mockResolvedValue({ ...airplane, isActive: false } as never);

    const result = await generateFlights(formValues, "USU_admin");

    expect(result.ok).toBe(false);
    expect(prismaMock.flight.findMany).not.toHaveBeenCalled();
  });

  it("rechaza capacidades mayores a los asientos del avión (US-09)", async () => {
    prismaMock.route.findUnique.mockResolvedValue(route as never);
    prismaMock.airplane.findUnique.mockResolvedValue(airplane as never);

    const result = await generateFlights(
      { ...formValues, economyCapacity: 151, firstClassCapacity: 17 },
      "USU_admin",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.economyCapacity).toBeDefined();
      expect(result.fieldErrors?.firstClassCapacity).toBeDefined();
    }
    expect(prismaMock.flight.findMany).not.toHaveBeenCalled();
  });

  it("rechaza si el período no contiene ninguna fecha que coincida con los días de operación", async () => {
    prismaMock.route.findUnique.mockResolvedValue(route as never);
    prismaMock.airplane.findUnique.mockResolvedValue(airplane as never);

    // 2026-10-02 es viernes: ningún jueves en el rango.
    const result = await generateFlights(
      { ...formValues, startDate: "2026-10-02", endDate: "2026-10-02" },
      "USU_admin",
    );

    expect(result.ok).toBe(false);
  });

  it("rechaza todo si ya existe un vuelo generado para el trayecto en alguna fecha", async () => {
    prismaMock.route.findUnique.mockResolvedValue(route as never);
    prismaMock.airplane.findUnique.mockResolvedValue(airplane as never);
    prismaMock.flight.findMany.mockResolvedValueOnce([
      { date: new Date("2026-10-01T00:00:00.000Z") },
    ] as never);

    const result = await generateFlights(formValues, "USU_admin");

    expect(result.ok).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rechaza todo si el avión queda con horarios superpuestos", async () => {
    prismaMock.route.findUnique.mockResolvedValue(route as never);
    prismaMock.airplane.findUnique.mockResolvedValue(airplane as never);
    prismaMock.flight.findMany
      .mockResolvedValueOnce([]) // sin vuelos ya generados para el trayecto
      .mockResolvedValueOnce([
        {
          departureAt: new Date("2026-10-01T09:00:00.000Z"),
          arrivalAt: new Date("2026-10-01T11:00:00.000Z"),
          code: "VU-20261001-002",
        },
      ] as never);

    const result = await generateFlights(formValues, "USU_admin");

    expect(result.ok).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("genera el período y un vuelo por fecha en el caso feliz", async () => {
    prismaMock.route.findUnique.mockResolvedValue(route as never);
    prismaMock.airplane.findUnique.mockResolvedValue(airplane as never);
    prismaMock.flight.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    prismaMock.salesPeriod.create.mockResolvedValue({ id: "PER_1" } as never);
    prismaMock.flight.create.mockResolvedValue({} as never);

    const result = await generateFlights(formValues, "USU_admin");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ salesPeriodId: "PER_1", count: 1 });
    }
    expect(prismaMock.salesPeriod.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: expect.stringMatching(/^PER_/),
        routeId: "TRA_1",
        airplaneId: "AVI_1",
        createdById: "USU_admin",
      }),
    });
    expect(prismaMock.flight.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: expect.stringMatching(/^VUE_/),
        code: "VU-20261001-001",
        routeId: "TRA_1",
        salesPeriodId: "PER_1",
        createdById: "USU_admin",
      }),
    });
  });
});

describe("updateFlight (US-05/US-09/US-11)", () => {
  const inOneWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const flightDate = new Date(
    Date.UTC(inOneWeek.getUTCFullYear(), inOneWeek.getUTCMonth(), inOneWeek.getUTCDate()),
  );
  const arrivalAt = new Date(inOneWeek.getTime() + 90 * 60 * 1000);

  const flight = {
    id: "VUE_1",
    status: "SCHEDULED",
    date: flightDate,
    departureAt: inOneWeek,
    arrivalAt,
    airplaneId: "AVI_1",
    economyCapacity: 150,
    firstClassCapacity: 16,
    economyOccupied: 8,
    firstClassOccupied: 4,
    airplane: { identifier: "LV-ARG01", economySeats: 150, firstClassSeats: 16 },
  };

  const values = {
    economyCapacity: 120,
    firstClassCapacity: 12,
    economyFare: 50000,
    firstClassFare: 99999.99,
  };

  it("rechaza si el vuelo no existe", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(null);

    const result = await updateFlight("VUE_1", values, "USU_admin");

    expect(result.ok).toBe(false);
    expect(prismaMock.flight.updateMany).not.toHaveBeenCalled();
  });

  it("rechaza si el vuelo está cancelado", async () => {
    prismaMock.flight.findUnique.mockResolvedValue({ ...flight, status: "CANCELLED" } as never);

    const result = await updateFlight("VUE_1", values, "USU_admin");

    expect(result.ok).toBe(false);
    expect(prismaMock.flight.updateMany).not.toHaveBeenCalled();
  });

  it("rechaza si el vuelo ya partió", async () => {
    prismaMock.flight.findUnique.mockResolvedValue({
      ...flight,
      departureAt: new Date(Date.now() - 60_000),
    } as never);

    const result = await updateFlight("VUE_1", values, "USU_admin");

    expect(result.ok).toBe(false);
    expect(prismaMock.flight.updateMany).not.toHaveBeenCalled();
  });

  it("rechaza una capacidad menor a los pasajes vendidos en esa clase", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(flight as never);

    const result = await updateFlight(
      "VUE_1",
      { ...values, economyCapacity: 7, firstClassCapacity: 3 },
      "USU_admin",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.economyCapacity?.[0]).toMatch(/8 pasajes/);
      expect(result.fieldErrors?.firstClassCapacity?.[0]).toMatch(/4 pasajes/);
    }
    expect(prismaMock.flight.updateMany).not.toHaveBeenCalled();
  });

  it("acepta una capacidad igual a los pasajes vendidos", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(flight as never);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateFlight(
      "VUE_1",
      { ...values, economyCapacity: 8, firstClassCapacity: 4 },
      "USU_admin",
    );

    expect(result.ok).toBe(true);
  });

  it("rechaza una capacidad mayor a los asientos del avión", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(flight as never);

    const result = await updateFlight(
      "VUE_1",
      { ...values, economyCapacity: 151, firstClassCapacity: 16 },
      "USU_admin",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.economyCapacity).toBeDefined();
    expect(prismaMock.flight.updateMany).not.toHaveBeenCalled();
  });

  it("no pisa ventas concurrentes: si la escritura condicionada no actualiza nada, informa el error", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(flight as never);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 0 });

    const result = await updateFlight("VUE_1", values, "USU_admin");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeDefined();
  });

  it("actualiza capacidad y tarifas (US-11) condicionado a lo ocupado y registra quién lo modificó", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(flight as never);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateFlight("VUE_1", values, "USU_admin");

    expect(result).toEqual({ ok: true, data: { id: "VUE_1" } });
    expect(prismaMock.flight.updateMany).toHaveBeenCalledWith({
      where: {
        id: "VUE_1",
        status: "SCHEDULED",
        economyOccupied: { lte: 120 },
        firstClassOccupied: { lte: 12 },
      },
      data: {
        economyCapacity: 120,
        firstClassCapacity: 12,
        economyFare: 50000,
        firstClassFare: 99999.99,
        departureAt: inOneWeek,
        arrivalAt,
        airplaneId: "AVI_1",
        updatedById: "USU_admin",
      },
    });
  });
});

describe("updateFlight — modificación de tarifas (US-12)", () => {
  const inOneWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const flightDate = new Date(
    Date.UTC(inOneWeek.getUTCFullYear(), inOneWeek.getUTCMonth(), inOneWeek.getUTCDate()),
  );

  // Vuelo con tarifas vigentes 45000 / 95000 y pasajes ya vendidos en ambas clases.
  const flight = {
    id: "VUE_1",
    status: "SCHEDULED",
    date: flightDate,
    departureAt: inOneWeek,
    arrivalAt: new Date(inOneWeek.getTime() + 90 * 60 * 1000),
    airplaneId: "AVI_1",
    economyCapacity: 150,
    firstClassCapacity: 16,
    economyFare: 45000,
    firstClassFare: 95000,
    economyOccupied: 8,
    firstClassOccupied: 4,
    airplane: { identifier: "LV-ARG01", economySeats: 150, firstClassSeats: 16 },
  };

  const values = {
    economyCapacity: 150,
    firstClassCapacity: 16,
    economyFare: 45000,
    firstClassFare: 95000,
  };

  it("CA1: sobrescribe la tarifa vigente con la nueva sin tocar la capacidad (modificación, no alta)", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(flight as never);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateFlight(
      "VUE_1",
      { ...values, economyFare: 52000, firstClassFare: 105000 },
      "USU_admin",
    );

    expect(result.ok).toBe(true);
    const arg = prismaMock.flight.updateMany.mock.calls[0][0];
    expect(arg.data.economyFare).toBe(52000);
    expect(arg.data.firstClassFare).toBe(105000);
    expect(arg.data.economyCapacity).toBe(150);
    expect(arg.data.firstClassCapacity).toBe(16);
  });

  it("CA2: las ventas ya confirmadas conservan su unitPrice (no se tocan Booking/Ticket)", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(flight as never);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateFlight(
      "VUE_1",
      { ...values, economyFare: 52000, firstClassFare: 105000 },
      "USU_admin",
    );

    expect(result.ok).toBe(true);
    expect(prismaMock.flight.updateMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
    expect(prismaMock.ticket.updateMany).not.toHaveBeenCalled();
  });
});

describe("updateFlight — modificación puntual (US-05)", () => {
  const inOneWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const flightDate = new Date(
    Date.UTC(inOneWeek.getUTCFullYear(), inOneWeek.getUTCMonth(), inOneWeek.getUTCDate()),
  );
  const departureAt = new Date(inOneWeek.getTime());
  const arrivalAt = new Date(inOneWeek.getTime() + 90 * 60 * 1000);

  const baseFlight = {
    id: "VUE_1",
    status: "SCHEDULED",
    date: flightDate,
    departureAt,
    arrivalAt,
    airplaneId: "AVI_1",
    economyCapacity: 150,
    firstClassCapacity: 16,
    economyOccupied: 8,
    firstClassOccupied: 4,
    airplane: { identifier: "LV-ARG01", economySeats: 150, firstClassSeats: 16 },
  };

  const values = {
    economyCapacity: 150,
    firstClassCapacity: 16,
    economyFare: 45000,
    firstClassFare: 95000,
  };

  it("rechaza reasignar a un avión con menos asientos que los pasajes vendidos", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(baseFlight as never);
    prismaMock.airplane.findUnique.mockResolvedValue({
      id: "AVI_2",
      identifier: "LV-CHICA",
      economySeats: 6,
      firstClassSeats: 2,
      isActive: true,
    } as never);

    const result = await updateFlight("VUE_1", { ...values, airplaneId: "AVI_2" }, "USU_admin");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.airplaneId).toBeDefined();
    expect(prismaMock.flight.updateMany).not.toHaveBeenCalled();
  });

  it("rechaza reasignar a un avión inexistente o inactivo", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(baseFlight as never);
    prismaMock.airplane.findUnique.mockResolvedValue(null);

    const result = await updateFlight("VUE_1", { ...values, airplaneId: "AVI_X" }, "USU_admin");

    expect(result.ok).toBe(false);
    expect(prismaMock.flight.updateMany).not.toHaveBeenCalled();
  });

  it("rechaza si el avión destino queda con un vuelo superpuesto", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(baseFlight as never);
    prismaMock.flight.findFirst.mockResolvedValue({ code: "VU-20261010-01" } as never);

    const result = await updateFlight(
      "VUE_1",
      { ...values, departureTime: "09:00", arrivalTime: "10:30" },
      "USU_admin",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/superpuesto/);
    expect(prismaMock.flight.updateMany).not.toHaveBeenCalled();
  });

  it("cambia el horario y registra el FlightChange cuando hay ventas (US-05/RF-10)", async () => {
    prismaMock.flight.findUnique.mockResolvedValue({
      ...baseFlight,
      tickets: [{ id: "PAS_1", booking: { id: "RES_1", contactEmail: "a@x.com" } }],
    } as never);
    prismaMock.flight.findFirst.mockResolvedValue(null);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.flightChange.create.mockResolvedValue({} as never);
    prismaMock.ticketContingency.createMany.mockResolvedValue({ count: 1 } as never);
    prismaMock.emailNotification.createMany.mockResolvedValue({ count: 1 } as never);

    const result = await updateFlight(
      "VUE_1",
      { ...values, departureTime: "09:00", arrivalTime: "10:30" },
      "USU_admin",
    );

    expect(result.ok).toBe(true);
    expect(prismaMock.flightChange.create).toHaveBeenCalledTimes(1);
    const arg = prismaMock.flightChange.create.mock.calls[0][0];
    expect(arg.data.type).toBe("SCHEDULE_CHANGE");
    expect(arg.data.previousDepartureAt).toEqual(departureAt);
    expect(arg.data.previousArrivalAt).toEqual(arrivalAt);
    expect(arg.data.newDepartureAt).toEqual(
      new Date(Date.UTC(flightDate.getUTCFullYear(), flightDate.getUTCMonth(), flightDate.getUTCDate(), 9, 0)),
    );
    expect(arg.data.newArrivalAt).toEqual(
      new Date(Date.UTC(flightDate.getUTCFullYear(), flightDate.getUTCMonth(), flightDate.getUTCDate(), 10, 30)),
    );
    expect(arg.data.createdById).toBe("USU_admin");
    expect(prismaMock.ticketContingency.createMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.emailNotification.createMany).toHaveBeenCalledTimes(1);
  });

  it("no registra FlightChange si cambia el horario pero no hay ventas", async () => {
    prismaMock.flight.findUnique.mockResolvedValue({
      ...baseFlight,
      economyOccupied: 0,
      firstClassOccupied: 0,
    } as never);
    prismaMock.flight.findFirst.mockResolvedValue(null);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateFlight(
      "VUE_1",
      { ...values, departureTime: "09:00", arrivalTime: "10:30" },
      "USU_admin",
    );

    expect(result.ok).toBe(true);
    expect(prismaMock.flightChange.create).not.toHaveBeenCalled();
  });

  it("crea contingencias y emails de cambio de horario cuando hay pasajes emitidos", async () => {
    prismaMock.flight.findUnique.mockResolvedValue({
      ...baseFlight,
      tickets: [
        { id: "PAS_1", booking: { id: "RES_1", contactEmail: "a@x.com" } },
        { id: "PAS_2", booking: { id: "RES_2", contactEmail: "b@x.com" } },
      ],
    } as never);
    prismaMock.flight.findFirst.mockResolvedValue(null);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.flightChange.create.mockResolvedValue({} as never);
    prismaMock.ticketContingency.createMany.mockResolvedValue({ count: 2 } as never);
    prismaMock.emailNotification.createMany.mockResolvedValue({ count: 2 } as never);

    const result = await updateFlight(
      "VUE_1",
      { ...values, departureTime: "09:00", arrivalTime: "10:30" },
      "USU_admin",
    );

    expect(result.ok).toBe(true);
    expect(prismaMock.flightChange.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.ticketContingency.createMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.emailNotification.createMany).toHaveBeenCalledTimes(1);

    const changeArg = prismaMock.flightChange.create.mock.calls[0][0];
    expect(changeArg.data.type).toBe("SCHEDULE_CHANGE");

    const contingencyArg = prismaMock.ticketContingency.createMany.mock.calls[0][0] as unknown as {
      data: { ticketId: string; accessToken: string }[];
    };
    expect(contingencyArg.data).toHaveLength(2);
    expect(contingencyArg.data.map((d) => d.ticketId)).toEqual(["PAS_1", "PAS_2"]);
    expect(new Set(contingencyArg.data.map((d) => d.accessToken)).size).toBe(2);

    const emailArg = prismaMock.emailNotification.createMany.mock.calls[0][0] as unknown as {
      data: { type: string; status: string; subject: string; recipientEmail: string }[];
    };
    expect(emailArg.data).toHaveLength(2);
    expect(emailArg.data[0].type).toBe("FLIGHT_SCHEDULE_CHANGE");
    expect(emailArg.data.every((e) => e.status === "PENDING")).toBe(true);
    expect(emailArg.data.every((e) => e.subject.includes("Cambio de horario"))).toBe(true);
    expect(emailArg.data.map((e) => e.recipientEmail).sort()).toEqual(["a@x.com", "b@x.com"]);
  });

  it("no registra FlightChange al cambiar solo el avión sin tocar el horario", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(baseFlight as never);
    prismaMock.airplane.findUnique.mockResolvedValue({
      id: "AVI_2",
      identifier: "LV-GRANDE",
      economySeats: 200,
      firstClassSeats: 20,
      isActive: true,
    } as never);
    prismaMock.flight.findFirst.mockResolvedValue(null);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateFlight("VUE_1", { ...values, airplaneId: "AVI_2" }, "USU_admin");

    expect(result.ok).toBe(true);
    expect(prismaMock.flightChange.create).not.toHaveBeenCalled();
    const arg = prismaMock.flight.updateMany.mock.calls[0][0];
    expect(arg.data.airplaneId).toBe("AVI_2");
  });

  it("no consulta superposición si no cambia ni el avión ni el horario", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(baseFlight as never);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateFlight("VUE_1", values, "USU_admin");

    expect(result.ok).toBe(true);
    expect(prismaMock.flight.findFirst).not.toHaveBeenCalled();
  });
});

describe("cancelFlight (US-06/RF-10)", () => {
  const inOneWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const baseFlight = {
    id: "VUE_1",
    code: "VU-20261001-001",
    status: "SCHEDULED",
    departureAt: inOneWeek,
    arrivalAt: new Date(inOneWeek.getTime() + 90 * 60 * 1000),
    tickets: [],
  };

  const tickets = [
    { id: "PAS_1", booking: { id: "RES_1", contactEmail: "a@x.com" } },
    { id: "PAS_2", booking: { id: "RES_1", contactEmail: "a@x.com" } },
    { id: "PAS_3", booking: { id: "RES_2", contactEmail: "b@x.com" } },
  ];

  it("rechaza si el vuelo no existe", async () => {
    prismaMock.flight.findUnique.mockResolvedValue(null);

    const result = await cancelFlight("VUE_1", { reason: "mantenimiento" }, "USU_admin");

    expect(result.ok).toBe(false);
    expect(prismaMock.flight.updateMany).not.toHaveBeenCalled();
  });

  it("rechaza si el vuelo ya está cancelado", async () => {
    prismaMock.flight.findUnique.mockResolvedValue({ ...baseFlight, status: "CANCELLED" } as never);

    const result = await cancelFlight("VUE_1", { reason: "operativo" }, "USU_admin");

    expect(result.ok).toBe(false);
    expect(prismaMock.flight.updateMany).not.toHaveBeenCalled();
  });

  it("rechaza si el vuelo ya partió", async () => {
    prismaMock.flight.findUnique.mockResolvedValue({
      ...baseFlight,
      departureAt: new Date(Date.now() - 60_000),
    } as never);

    const result = await cancelFlight("VUE_1", { reason: "operativo" }, "USU_admin");

    expect(result.ok).toBe(false);
    expect(prismaMock.flight.updateMany).not.toHaveBeenCalled();
  });

  it("cancela, marca CANCELLED y registra el outbox cuando hay pasajes vendidos", async () => {
    prismaMock.flight.findUnique.mockResolvedValue({ ...baseFlight, tickets } as never);
    prismaMock.flightChange.create.mockResolvedValue({} as never);
    prismaMock.ticketContingency.createMany.mockResolvedValue({ count: 3 } as never);
    prismaMock.emailNotification.createMany.mockResolvedValue({ count: 2 } as never);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 1 });

    const result = await cancelFlight("VUE_1", { reason: "meteorologico" }, "USU_admin");

    expect(result).toEqual({ ok: true, data: { id: "VUE_1", affectedTickets: 3 } });

    const changeArg = prismaMock.flightChange.create.mock.calls[0][0];
    expect(changeArg.data.type).toBe("CANCELLATION");
    expect(changeArg.data.newDepartureAt).toBeNull();
    expect(changeArg.data.newArrivalAt).toBeNull();
    expect(changeArg.data.reason).toBe(CANCELLATION_REASON_LABELS.meteorologico);
    expect(changeArg.data.createdById).toBe("USU_admin");

    const contingencyArg = prismaMock.ticketContingency.createMany.mock.calls[0][0] as unknown as {
      data: { ticketId: string; accessToken: string }[];
    };
    expect(contingencyArg.data).toHaveLength(3);
    expect(contingencyArg.data[0].accessToken).toBeTruthy();
    expect(contingencyArg.data[0].ticketId).toBe("PAS_1");

    const emailArg = prismaMock.emailNotification.createMany.mock.calls[0][0] as unknown as {
      data: { type: string; status: string; recipientEmail: string }[];
    };
    expect(emailArg.data).toHaveLength(2);
    expect(emailArg.data[0].type).toBe("FLIGHT_CANCELLATION");
    expect(emailArg.data[0].status).toBe("PENDING");
    expect(emailArg.data[0].recipientEmail).toBe("a@x.com");

    expect(prismaMock.flight.updateMany).toHaveBeenCalledWith({
      where: { id: "VUE_1", status: "SCHEDULED" },
      data: expect.objectContaining({
        status: "CANCELLED",
        cancellationReason: CANCELLATION_REASON_LABELS.meteorologico,
        updatedById: "USU_admin",
      }),
    });
  });

  it("no genera contingencias ni emails si no hay pasajes vendidos", async () => {
    prismaMock.flight.findUnique.mockResolvedValue({ ...baseFlight, tickets: [] } as never);
    prismaMock.flightChange.create.mockResolvedValue({} as never);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 1 });

    const result = await cancelFlight("VUE_1", { reason: "operativo" }, "USU_admin");

    expect(result).toEqual({ ok: true, data: { id: "VUE_1", affectedTickets: 0 } });
    expect(prismaMock.flightChange.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.ticketContingency.createMany).not.toHaveBeenCalled();
    expect(prismaMock.emailNotification.createMany).not.toHaveBeenCalled();
  });

  it("no pisa una cancelación concurrente: si la escritura condicionada no actualiza nada, informa el error", async () => {
    prismaMock.flight.findUnique.mockResolvedValue({ ...baseFlight, tickets: [] } as never);
    prismaMock.flightChange.create.mockResolvedValue({} as never);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 0 });

    const result = await cancelFlight("VUE_1", { reason: "operativo" }, "USU_admin");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeDefined();
  });
});

describe("cancelFlightsByRoute (US-06/RF-10)", () => {
  const inOneWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const futureFlight = (
    id: string,
    code: string,
    tickets: { id: string; booking: { id: string; contactEmail: string } }[] = [],
  ) => ({
    id,
    code,
    departureAt: inOneWeek,
    arrivalAt: new Date(inOneWeek.getTime() + 60 * 60 * 1000),
    tickets,
  });

  it("rechaza si el trayecto no existe", async () => {
    prismaMock.route.findUnique.mockResolvedValue(null);

    const result = await cancelFlightsByRoute({ routeId: "TRA_1", reason: "operativo" }, "USU_admin");

    expect(result.ok).toBe(false);
    expect(prismaMock.flight.findMany).not.toHaveBeenCalled();
  });

  it("rechaza si el trayecto no tiene vuelos programados futuros", async () => {
    prismaMock.route.findUnique.mockResolvedValue({ id: "TRA_1" } as never);
    prismaMock.flight.findMany.mockResolvedValue([] as never);

    const result = await cancelFlightsByRoute({ routeId: "TRA_1", reason: "operativo" }, "USU_admin");

    expect(result.ok).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("cancela todos los vuelos futuros del trayecto y arma el outbox", async () => {
    prismaMock.route.findUnique.mockResolvedValue({ id: "TRA_1" } as never);
    prismaMock.flight.findMany.mockResolvedValue([
      futureFlight("VUE_1", "VU-1", [
        { id: "PAS_1", booking: { id: "RES_1", contactEmail: "a@x.com" } },
      ]),
      futureFlight("VUE_2", "VU-2"),
    ] as never);
    prismaMock.flightChange.createMany.mockResolvedValue({ count: 2 } as never);
    prismaMock.ticketContingency.createMany.mockResolvedValue({ count: 1 } as never);
    prismaMock.emailNotification.createMany.mockResolvedValue({ count: 1 } as never);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 2 });

    const result = await cancelFlightsByRoute(
      { routeId: "TRA_1", reason: "mantenimiento" },
      "USU_admin",
    );

    expect(result).toEqual({ ok: true, data: { cancelled: 2, affectedTickets: 1 } });

    const changesArg = prismaMock.flightChange.createMany.mock.calls[0][0] as unknown as {
      data: { type: string; reason: string }[];
    };
    expect(changesArg.data).toHaveLength(2);
    expect(changesArg.data[0].type).toBe("CANCELLATION");
    expect(changesArg.data[0].reason).toBe(CANCELLATION_REASON_LABELS.mantenimiento);

    const routeContingencies = prismaMock.ticketContingency.createMany.mock.calls[0][0] as unknown as {
      data: unknown[];
    };
    const routeEmails = prismaMock.emailNotification.createMany.mock.calls[0][0] as unknown as {
      data: unknown[];
    };
    expect(routeContingencies.data).toHaveLength(1);
    expect(routeEmails.data).toHaveLength(1);

    expect(prismaMock.flight.updateMany).toHaveBeenCalledWith({
      where: {
        routeId: "TRA_1",
        status: "SCHEDULED",
        departureAt: { gt: expect.any(Date) },
      },
      data: expect.objectContaining({
        status: "CANCELLED",
        cancellationReason: CANCELLATION_REASON_LABELS.mantenimiento,
        updatedById: "USU_admin",
      }),
    });
  });

  it("no pisa cancelaciones concurrentes: si la escritura condicionada no actualiza nada, informa el error", async () => {
    prismaMock.route.findUnique.mockResolvedValue({ id: "TRA_1" } as never);
    prismaMock.flight.findMany.mockResolvedValue([futureFlight("VUE_1", "VU-1")] as never);
    prismaMock.flightChange.createMany.mockResolvedValue({ count: 1 } as never);
    prismaMock.flight.updateMany.mockResolvedValue({ count: 0 });

    const result = await cancelFlightsByRoute({ routeId: "TRA_1", reason: "operativo" }, "USU_admin");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeDefined();
  });
});
