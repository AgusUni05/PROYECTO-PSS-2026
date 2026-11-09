import { prisma } from "@/lib/prisma";
import { flightFiltersSchema, type FlightFilters } from "./schema";
import { completePastFlights } from "./status";
import type { FlightAuditAction, FlightAuditChange } from "./audit";

export const FLIGHTS_PAGE_SIZE = 10;

export type FlightListItem = {
  id: string;
  code: string;
  date: Date;
  departureAt: Date;
  arrivalAt: Date;
  originCode: string;
  destinationCode: string;
  airplaneId: string;
  airplaneIdentifier: string;
  airplaneEconomySeats: number;
  airplaneFirstClassSeats: number;
  economyCapacity: number;
  economyOccupied: number;
  firstClassCapacity: number;
  firstClassOccupied: number;
  economyFare: string;
  firstClassFare: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  issuedTickets: number;
};

/** US-04: listado de vuelos generados, filtrado y paginado. */
export async function listFlights(rawFilters: Record<string, string | undefined>) {
  const filters: FlightFilters = flightFiltersSchema.parse(rawFilters);
  await completePastFlights();

  const routeFilter = {
    ...(filters.origen && { originId: filters.origen }),
    ...(filters.destino && { destinationId: filters.destino }),
  };

  const where = {
    ...(filters.estado !== "todos" && { status: filters.estado }),
    ...(filters.fecha && { date: new Date(`${filters.fecha}T00:00:00.000Z`) }),
    ...(Object.keys(routeFilter).length > 0 && { route: routeFilter }),
  };

  const [total, rows] = await Promise.all([
    prisma.flight.count({ where }),
    prisma.flight.findMany({
      where,
      orderBy: [{ date: "asc" }, { departureAt: "asc" }],
      skip: (filters.page - 1) * FLIGHTS_PAGE_SIZE,
      take: FLIGHTS_PAGE_SIZE,
      include: {
        route: { include: { origin: { select: { code: true } }, destination: { select: { code: true } } } },
        airplane: {
          select: { id: true, identifier: true, economySeats: true, firstClassSeats: true },
        },
        _count: { select: { tickets: { where: { status: "ISSUED" } } } },
      },
    }),
  ]);

  const flights: FlightListItem[] = rows.map((f) => ({
    id: f.id,
    code: f.code,
    date: f.date,
    departureAt: f.departureAt,
    arrivalAt: f.arrivalAt,
    originCode: f.route.origin.code,
    destinationCode: f.route.destination.code,
    airplaneId: f.airplane.id,
    airplaneIdentifier: f.airplane.identifier,
    airplaneEconomySeats: f.airplane.economySeats,
    airplaneFirstClassSeats: f.airplane.firstClassSeats,
    economyCapacity: f.economyCapacity,
    economyOccupied: f.economyOccupied,
    firstClassCapacity: f.firstClassCapacity,
    firstClassOccupied: f.firstClassOccupied,
    economyFare: f.economyFare.toString(),
    firstClassFare: f.firstClassFare.toString(),
    status: f.status,
    issuedTickets: f._count.tickets,
  }));

  return {
    flights,
    total,
    filters,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / FLIGHTS_PAGE_SIZE)),
  };
}

export type RouteForCancellationOption = {
  id: string;
  code: string;
  originCode: string;
  destinationCode: string;
  futureFlightCount: number;
};

/**
 * US-06: trayectos activos que tienen al menos un vuelo programado futuro, para
 * el selector de cancelación masiva. Ordenados por código.
 */
export async function listRoutesForCancellation(): Promise<RouteForCancellationOption[]> {
  const now = new Date();
  const routes = await prisma.route.findMany({
    where: {
      isActive: true,
      flights: { some: { status: "SCHEDULED", departureAt: { gt: now } } },
    },
    orderBy: { code: "asc" },
    include: {
      origin: { select: { code: true } },
      destination: { select: { code: true } },
      _count: {
        select: { flights: { where: { status: "SCHEDULED", departureAt: { gt: now } } } },
      },
    },
  });

  return routes.map((r) => ({
    id: r.id,
    code: r.code,
    originCode: r.origin.code,
    destinationCode: r.destination.code,
    futureFlightCount: r._count.flights,
  }));
}

export type FlightAuditEntry = {
  id: string;
  action: FlightAuditAction;
  changes: FlightAuditChange[];
  reason: string | null;
  createdAt: Date;
  userName: string;
  userEmail: string;
};

export type FlightAuditTrail = {
  code: string;
  date: Date;
  originCode: string;
  destinationCode: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  createdAt: Date;
  createdByName: string;
  events: FlightAuditEntry[];
};

/** US-43: historial de auditoría de un vuelo, del evento más antiguo al más reciente. */
export async function getFlightAuditTrail(flightId: string): Promise<FlightAuditTrail | null> {
  const flight = await prisma.flight.findUnique({
    where: { id: flightId },
    include: {
      route: { include: { origin: { select: { code: true } }, destination: { select: { code: true } } } },
      createdBy: { select: { firstName: true, lastName: true } },
      auditEvents: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      },
    },
  });
  if (!flight) return null;

  return {
    code: flight.code,
    date: flight.date,
    originCode: flight.route.origin.code,
    destinationCode: flight.route.destination.code,
    status: flight.status,
    createdAt: flight.createdAt,
    createdByName: `${flight.createdBy.firstName} ${flight.createdBy.lastName}`,
    events: flight.auditEvents.map((e) => ({
      id: e.id,
      action: e.action,
      changes: e.changes as FlightAuditChange[],
      reason: e.reason,
      createdAt: e.createdAt,
      userName: `${e.user.firstName} ${e.user.lastName}`,
      userEmail: e.user.email,
    })),
  };
}
