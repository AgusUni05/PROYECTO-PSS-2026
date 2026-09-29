import { prisma } from "@/lib/prisma";
import { airplaneFiltersSchema, type AirplaneFilters } from "./schema";

export const AIRPLANES_PAGE_SIZE = 10;

export type AirplaneListItem = {
  id: string;
  identifier: string;
  model: string;
  economySeats: number;
  firstClassSeats: number;
  isActive: boolean;
  futureFlightsCount: number;
};

/** US-02: listado filtrado y paginado, con cantidad de vuelos futuros por avión. */
export async function listAirplanes(rawFilters: Record<string, string | undefined>) {
  const filters: AirplaneFilters = airplaneFiltersSchema.parse(rawFilters);

  const where = {
    ...(filters.estado === "activos" && { isActive: true }),
    ...(filters.estado === "inactivos" && { isActive: false }),
    ...(filters.config === "mixto" && { firstClassSeats: { gt: 0 } }),
    ...(filters.config === "economy" && { firstClassSeats: 0 }),
    ...(filters.q && {
      OR: [
        { identifier: { contains: filters.q, mode: "insensitive" as const } },
        { model: { contains: filters.q, mode: "insensitive" as const } },
      ],
    }),
  };

  const now = new Date();
  const [total, rows, summary] = await Promise.all([
    prisma.airplane.count({ where }),
    prisma.airplane.findMany({
      where,
      orderBy: { identifier: "asc" },
      skip: (filters.page - 1) * AIRPLANES_PAGE_SIZE,
      take: AIRPLANES_PAGE_SIZE,
      include: {
        _count: {
          select: { flights: { where: { status: "SCHEDULED", departureAt: { gt: now } } } },
        },
      },
    }),
    prisma.airplane.aggregate({
      where: { isActive: true },
      _count: true,
      _avg: { economySeats: true, firstClassSeats: true },
    }),
  ]);

  const airplanes: AirplaneListItem[] = rows.map((a) => ({
    id: a.id,
    identifier: a.identifier,
    model: a.model,
    economySeats: a.economySeats,
    firstClassSeats: a.firstClassSeats,
    isActive: a.isActive,
    futureFlightsCount: a._count.flights,
  }));

  return {
    airplanes,
    total,
    filters,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / AIRPLANES_PAGE_SIZE)),
    summary: {
      activeCount: summary._count,
      averageCapacity: Math.round(
        (summary._avg.economySeats ?? 0) + (summary._avg.firstClassSeats ?? 0),
      ),
    },
  };
}

export async function getAirplaneById(id: string) {
  return prisma.airplane.findUnique({ where: { id } });
}

export type ActiveAirplaneOption = {
  id: string;
  identifier: string;
  model: string;
  economySeats: number;
  firstClassSeats: number;
};

/** Aviones activos, para el select del generador de vuelos (US-04). */
export async function listActiveAirplanes(): Promise<ActiveAirplaneOption[]> {
  return prisma.airplane.findMany({
    where: { isActive: true },
    orderBy: { identifier: "asc" },
    select: { id: true, identifier: true, model: true, economySeats: true, firstClassSeats: true },
  });
}
