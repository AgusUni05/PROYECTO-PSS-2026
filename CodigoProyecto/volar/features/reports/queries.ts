import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { parseDateString } from "@/lib/dates";
import { reportFiltersSchema, type ReportFilters } from "./schema";

export const REPORT_PAGE_SIZE = 10;

export type OccupancyReportRow = {
  id: string;
  code: string;
  date: Date;
  originCode: string;
  destinationCode: string;
  airplaneModel: string;
  economyCapacity: number;
  economySold: number;
  firstClassCapacity: number;
  firstClassSold: number;
  revenue: string;
};

export type OccupancySummary = {
  totalCapacity: number;
  totalSold: number;
  occupancyRate: number;
  economyOccupancyRate: number;
  firstClassOccupancyRate: number;
  grossRevenue: string;
};

export type OccupancyReport = {
  flights: OccupancyReportRow[];
  total: number;
  page: number;
  pageCount: number;
  filters: ReportFilters;
  summary: OccupancySummary;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function rate(sold: number, capacity: number): number {
  return capacity > 0 ? round1((sold / capacity) * 100) : 0;
}

/**
 * US-27: ocupación por vuelo, clase y fecha, con filtros por rango de fechas,
 * trayecto y clase, y KPIs globales (no solo de la página visible).
 * "Vendidos" = asientos ocupados (vendidos + retenidos), la misma noción de
 * cupo que usa el resto de la app (US-09/US-10: disponible = capacidad − ocupados).
 */
export async function getOccupancyReport(
  rawFilters: Record<string, string | undefined>,
): Promise<OccupancyReport> {
  const filters: ReportFilters = reportFiltersSchema.parse(rawFilters);

  const desde = parseDateString(filters.desde);
  const hastaParsed = parseDateString(filters.hasta);
  const hasta = hastaParsed < desde ? desde : hastaParsed;

  const where: Prisma.FlightWhereInput = {
    date: { gte: desde, lte: hasta },
    ...(filters.ruta && { routeId: filters.ruta }),
  };

  const [total, rows, capacityAgg, revenueAgg] = await Promise.all([
    prisma.flight.count({ where }),
    prisma.flight.findMany({
      where,
      orderBy: [{ date: "asc" }, { departureAt: "asc" }],
      skip: (filters.page - 1) * REPORT_PAGE_SIZE,
      take: REPORT_PAGE_SIZE,
      include: {
        route: { include: { origin: { select: { code: true } }, destination: { select: { code: true } } } },
        airplane: { select: { model: true } },
        tickets: { where: { status: "ISSUED" }, select: { unitPrice: true } },
      },
    }),
    prisma.flight.aggregate({
      where,
      _sum: {
        economyCapacity: true,
        economyOccupied: true,
        firstClassCapacity: true,
        firstClassOccupied: true,
      },
    }),
    prisma.ticket.aggregate({
      where: {
        status: "ISSUED",
        flight: where,
        ...(filters.clase !== "todas" && { seatClass: filters.clase }),
      },
      _sum: { unitPrice: true },
    }),
  ]);

  const flights: OccupancyReportRow[] = rows.map((f) => ({
    id: f.id,
    code: f.code,
    date: f.date,
    originCode: f.route.origin.code,
    destinationCode: f.route.destination.code,
    airplaneModel: f.airplane.model,
    economyCapacity: f.economyCapacity,
    economySold: f.economyOccupied,
    firstClassCapacity: f.firstClassCapacity,
    firstClassSold: f.firstClassOccupied,
    revenue: f.tickets.reduce((sum, t) => sum + Number(t.unitPrice), 0).toString(),
  }));

  const economyCapacity = capacityAgg._sum.economyCapacity ?? 0;
  const economyOccupied = capacityAgg._sum.economyOccupied ?? 0;
  const firstClassCapacity = capacityAgg._sum.firstClassCapacity ?? 0;
  const firstClassOccupied = capacityAgg._sum.firstClassOccupied ?? 0;

  const totalCapacity =
    filters.clase === "ECONOMY"
      ? economyCapacity
      : filters.clase === "FIRST"
        ? firstClassCapacity
        : economyCapacity + firstClassCapacity;
  const totalSold =
    filters.clase === "ECONOMY"
      ? economyOccupied
      : filters.clase === "FIRST"
        ? firstClassOccupied
        : economyOccupied + firstClassOccupied;

  const summary: OccupancySummary = {
    totalCapacity,
    totalSold,
    occupancyRate: rate(totalSold, totalCapacity),
    economyOccupancyRate: rate(economyOccupied, economyCapacity),
    firstClassOccupancyRate: rate(firstClassOccupied, firstClassCapacity),
    grossRevenue: (revenueAgg._sum.unitPrice ?? new Prisma.Decimal(0)).toString(),
  };

  return {
    flights,
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / REPORT_PAGE_SIZE)),
    filters,
    summary,
  };
}
