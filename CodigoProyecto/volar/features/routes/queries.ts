import { prisma } from "@/lib/prisma";
import type { DayOfWeek } from "@/generated/prisma/enums";
import { routeFiltersSchema, type RouteFilters } from "./schema";
import { isNextDayArrival } from "./time";

export const ROUTES_PAGE_SIZE = 10;

export type RouteListItem = {
  id: string;
  code: string;
  originCode: string;
  destinationCode: string;
  operatingDays: DayOfWeek[];
  departureTime: string;
  arrivalTime: string;
  nextDayArrival: boolean;
  isActive: boolean;
  hasSoldTickets: boolean;
};

/** US-03: listado filtrado y paginado, con el flag de pasajes vendidos por fila. */
export async function listRoutes(rawFilters: Record<string, string | undefined>) {
  const filters: RouteFilters = routeFiltersSchema.parse(rawFilters);

  const where = {
    ...(filters.estado === "activos" && { isActive: true }),
    ...(filters.estado === "inactivos" && { isActive: false }),
    ...(filters.origen && { originId: filters.origen }),
    ...(filters.destino && { destinationId: filters.destino }),
  };

  const [total, rows] = await Promise.all([
    prisma.route.count({ where }),
    prisma.route.findMany({
      where,
      orderBy: { code: "asc" },
      skip: (filters.page - 1) * ROUTES_PAGE_SIZE,
      take: ROUTES_PAGE_SIZE,
      include: { origin: { select: { code: true } }, destination: { select: { code: true } } },
    }),
  ]);

  const routeIds = rows.map((r) => r.id);
  const soldTicketRouteIds = await getRoutesWithSoldTickets(routeIds);

  const routes: RouteListItem[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    originCode: r.origin.code,
    destinationCode: r.destination.code,
    operatingDays: r.operatingDays,
    departureTime: r.departureTime,
    arrivalTime: r.arrivalTime,
    nextDayArrival: isNextDayArrival(r.departureTime, r.arrivalTime),
    isActive: r.isActive,
    hasSoldTickets: soldTicketRouteIds.has(r.id),
  }));

  return {
    routes,
    total,
    filters,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / ROUTES_PAGE_SIZE)),
  };
}

/** IDs, dentro de `routeIds`, que tienen al menos un pasaje (e-ticket) emitido. */
async function getRoutesWithSoldTickets(routeIds: string[]): Promise<Set<string>> {
  if (routeIds.length === 0) return new Set();

  const tickets = await prisma.ticket.findMany({
    where: { status: "ISSUED", flight: { routeId: { in: routeIds } } },
    select: { flight: { select: { routeId: true } } },
  });

  return new Set(tickets.map((t) => t.flight.routeId));
}

export async function getRouteById(id: string) {
  return prisma.route.findUnique({ where: { id } });
}

export type ActiveRouteOption = {
  id: string;
  code: string;
  originCode: string;
  destinationCode: string;
  operatingDays: DayOfWeek[];
  departureTime: string;
  arrivalTime: string;
};

/** Trayectos activos, para el select del generador de vuelos (US-04). */
export async function listActiveRoutes(): Promise<ActiveRouteOption[]> {
  const routes = await prisma.route.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
    include: { origin: { select: { code: true } }, destination: { select: { code: true } } },
  });

  return routes.map((r) => ({
    id: r.id,
    code: r.code,
    originCode: r.origin.code,
    destinationCode: r.destination.code,
    operatingDays: r.operatingDays,
    departureTime: r.departureTime,
    arrivalTime: r.arrivalTime,
  }));
}
