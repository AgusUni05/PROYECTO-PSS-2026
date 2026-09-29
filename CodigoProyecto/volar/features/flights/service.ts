import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/id";
import type { ActionResult } from "@/lib/action-result";
import type { GenerateFlightsFormValues } from "./schema";
import { buildFlightWindow, matchingDates, windowsOverlap, type FlightWindow } from "./generation";

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function yyyymmdd(date: Date): string {
  return formatDate(date).replace(/-/g, "");
}

/**
 * US-04/US-07: genera un SalesPeriod y un Flight por cada fecha del rango que
 * coincide con los días de operación del trayecto. Todo o nada: si alguna
 * fecha ya tiene un vuelo generado para este trayecto, o si el avión queda
 * con horarios superpuestos en alguna fecha, no se crea nada.
 */
export async function generateFlights(
  data: GenerateFlightsFormValues,
  createdById: string,
): Promise<ActionResult<{ salesPeriodId: string; count: number }>> {
  const route = await prisma.route.findUnique({ where: { id: data.routeId } });
  if (!route || !route.isActive) {
    return { ok: false, error: "El trayecto seleccionado no existe o está inactivo." };
  }

  const airplane = await prisma.airplane.findUnique({ where: { id: data.airplaneId } });
  if (!airplane || !airplane.isActive) {
    return { ok: false, error: "El avión seleccionado no existe o está inactivo." };
  }

  const dates = matchingDates(data.startDate, data.endDate, route.operatingDays);
  if (dates.length === 0) {
    return {
      ok: false,
      error: "El período no contiene ninguna fecha que coincida con los días de operación del trayecto.",
    };
  }

  const windows = dates.map((date) => buildFlightWindow(date, route.departureTime, route.arrivalTime));

  const existing = await prisma.flight.findMany({
    where: { routeId: route.id, date: { in: dates } },
    select: { date: true },
  });
  if (existing.length > 0) {
    return {
      ok: false,
      error: `Ya existen vuelos generados para este trayecto en ${existing.length} fecha(s) del período (ej: ${formatDate(existing[0].date)}). Ajustá el rango o cancelá los vuelos existentes primero.`,
    };
  }

  const minDeparture = windows.reduce(
    (min, w) => (w.departureAt < min ? w.departureAt : min),
    windows[0].departureAt,
  );
  const maxArrival = windows.reduce(
    (max, w) => (w.arrivalAt > max ? w.arrivalAt : max),
    windows[0].arrivalAt,
  );

  const airplaneFlights = await prisma.flight.findMany({
    where: {
      airplaneId: airplane.id,
      status: "SCHEDULED",
      departureAt: { lte: maxArrival },
      arrivalAt: { gte: minDeparture },
    },
    select: { departureAt: true, arrivalAt: true, code: true },
  });

  const conflict = findFirstOverlap(windows, airplaneFlights);
  if (conflict) {
    return {
      ok: false,
      error: `El avión ${airplane.identifier} ya tiene un vuelo asignado (${conflict.with}) que se superpone con el ${formatDate(conflict.window.date)}. Elegí otro avión o ajustá el período.`,
    };
  }

  const salesPeriod = await prisma.$transaction(async (tx) => {
    const period = await tx.salesPeriod.create({
      data: {
        id: newId("SalesPeriod"),
        routeId: route.id,
        startDate: new Date(`${data.startDate}T00:00:00.000Z`),
        endDate: new Date(`${data.endDate}T00:00:00.000Z`),
        airplaneId: airplane.id,
        economyCapacity: data.economyCapacity,
        firstClassCapacity: data.firstClassCapacity,
        economyFare: data.economyFare,
        firstClassFare: data.firstClassFare,
        createdById,
      },
    });

    for (const w of windows) {
      await tx.flight.create({
        data: {
          id: newId("Flight"),
          code: `VU-${yyyymmdd(w.date)}-${route.code.replace("TR-", "")}`,
          routeId: route.id,
          salesPeriodId: period.id,
          date: w.date,
          departureAt: w.departureAt,
          arrivalAt: w.arrivalAt,
          airplaneId: airplane.id,
          economyCapacity: data.economyCapacity,
          firstClassCapacity: data.firstClassCapacity,
          economyFare: data.economyFare,
          firstClassFare: data.firstClassFare,
          createdById,
        },
      });
    }

    return period;
  });

  return { ok: true, data: { salesPeriodId: salesPeriod.id, count: windows.length } };
}

/** Primer conflicto de superposición, contra vuelos ya existentes del avión y entre las propias ventanas del período. */
function findFirstOverlap(
  windows: FlightWindow[],
  existingFlights: { departureAt: Date; arrivalAt: Date; code: string }[],
): { window: FlightWindow; with: string } | null {
  const accepted: FlightWindow[] = [];

  for (const w of windows) {
    const existingConflict = existingFlights.find((f) => windowsOverlap(w, f));
    if (existingConflict) return { window: w, with: existingConflict.code };

    const batchConflict = accepted.find((a) => windowsOverlap(w, a));
    if (batchConflict) {
      return { window: w, with: `otro vuelo generado en este mismo período (${formatDate(batchConflict.date)})` };
    }

    accepted.push(w);
  }

  return null;
}
