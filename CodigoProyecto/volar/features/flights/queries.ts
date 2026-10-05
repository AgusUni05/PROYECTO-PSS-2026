import { prisma } from "@/lib/prisma";
import { flightFiltersSchema, type FlightFilters } from "./schema";
import { completePastFlights } from "./status";

export const FLIGHTS_PAGE_SIZE = 10;

export type FlightListItem = {
  id: string;
  code: string;
  date: Date;
  departureAt: Date;
  arrivalAt: Date;
  originCode: string;
  destinationCode: string;
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
        airplane: { select: { identifier: true, economySeats: true, firstClassSeats: true } },
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
  }));

  return {
    flights,
    total,
    filters,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / FLIGHTS_PAGE_SIZE)),
  };
}
