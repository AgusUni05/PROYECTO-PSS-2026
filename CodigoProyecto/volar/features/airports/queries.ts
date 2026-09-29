import { prisma } from "@/lib/prisma";
import { airportFiltersSchema, type AirportFilters } from "./schema";

export const AIRPORTS_PAGE_SIZE = 10;

export type AirportListItem = {
  id: string;
  code: string;
  name: string;
  city: string;
  isActive: boolean;
  activeRoutesCount: number;
  hasFutureFlights: boolean;
};

/** US-01: listado filtrado y paginado, con datos para habilitar/bloquear la baja. */
export async function listAirports(rawFilters: Record<string, string | undefined>) {
  const filters: AirportFilters = airportFiltersSchema.parse(rawFilters);

  const where = {
    ...(filters.estado === "activos" && { isActive: true }),
    ...(filters.estado === "inactivos" && { isActive: false }),
    ...(filters.q && {
      OR: [
        { code: { contains: filters.q, mode: "insensitive" as const } },
        { name: { contains: filters.q, mode: "insensitive" as const } },
        { city: { contains: filters.q, mode: "insensitive" as const } },
      ],
    }),
  };

  const [total, rows] = await Promise.all([
    prisma.airport.count({ where }),
    prisma.airport.findMany({
      where,
      orderBy: { code: "asc" },
      skip: (filters.page - 1) * AIRPORTS_PAGE_SIZE,
      take: AIRPORTS_PAGE_SIZE,
      include: {
        _count: {
          select: {
            departingRoutes: { where: { isActive: true } },
            arrivingRoutes: { where: { isActive: true } },
          },
        },
      },
    }),
  ]);

  const airportIds = rows.map((a) => a.id);
  const blockedIds = await getAirportsWithFutureFlights(airportIds);

  const airports: AirportListItem[] = rows.map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    city: a.city,
    isActive: a.isActive,
    activeRoutesCount: a._count.departingRoutes + a._count.arrivingRoutes,
    hasFutureFlights: blockedIds.has(a.id),
  }));

  return {
    airports,
    total,
    filters,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / AIRPORTS_PAGE_SIZE)),
  };
}

/** IDs, dentro de `airportIds`, que tienen al menos un vuelo futuro programado. */
async function getAirportsWithFutureFlights(airportIds: string[]): Promise<Set<string>> {
  if (airportIds.length === 0) return new Set();

  const flights = await prisma.flight.findMany({
    where: {
      status: "SCHEDULED",
      departureAt: { gt: new Date() },
      route: {
        OR: [{ originId: { in: airportIds } }, { destinationId: { in: airportIds } }],
      },
    },
    select: { route: { select: { originId: true, destinationId: true } } },
  });

  const blocked = new Set<string>();
  for (const f of flights) {
    if (airportIds.includes(f.route.originId)) blocked.add(f.route.originId);
    if (airportIds.includes(f.route.destinationId)) blocked.add(f.route.destinationId);
  }
  return blocked;
}

export async function getAirportById(id: string) {
  return prisma.airport.findUnique({ where: { id } });
}

/** Aeropuertos activos, para los selects de origen/destino de Trayectos (US-03). */
export async function listActiveAirports() {
  return prisma.airport.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, city: true },
  });
}
