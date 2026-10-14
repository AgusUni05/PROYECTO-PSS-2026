import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/id";
import type { ActionResult } from "@/lib/action-result";
import type { EditFlightFormValues, GenerateFlightsFormValues } from "./schema";
import {
  buildFlightWindow,
  buildWindowFromTimes,
  matchingDates,
  windowsOverlap,
  type FlightWindow,
} from "./generation";

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

  const seatErrors = capacityAboveSeatsErrors(data, airplane);
  if (seatErrors) return { ok: false, fieldErrors: seatErrors };

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
      status: { not: "CANCELLED" },
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

type FieldErrors = Record<string, string[]>;

/** US-09: la capacidad de cada clase no puede superar los asientos del avión (capacidad real). */
function capacityAboveSeatsErrors(
  data: { economyCapacity: number; firstClassCapacity: number },
  airplane: { identifier: string; economySeats: number; firstClassSeats: number },
): FieldErrors | null {
  const errors: FieldErrors = {};
  if (data.economyCapacity > airplane.economySeats) {
    errors.economyCapacity = [
      `No puede superar los ${airplane.economySeats} asientos Economy del avión ${airplane.identifier}`,
    ];
  }
  if (data.firstClassCapacity > airplane.firstClassSeats) {
    errors.firstClassCapacity = [
      `No puede superar los ${airplane.firstClassSeats} asientos de Primera del avión ${airplane.identifier}`,
    ];
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * US-05/US-09/US-11/US-12: modifica un vuelo puntual. Solo vuelos programados
 * que todavía no partieron. Permite reasignar el avión (US-05, sin bajar de lo
 * vendido) y cambiar el horario de partida/llegada (US-05); si hay ventas y
 * cambia el horario se registra un FlightChange que dispara la notificación de
 * contingencia (RF-10). También ajusta capacidad (US-09) y tarifas (US-11/12).
 * La tarifa nueva aplica a las compras futuras: las ya hechas conservan el
 * precio pagado (Booking/Ticket.unitPrice).
 */
export async function updateFlight(
  id: string,
  data: EditFlightFormValues,
  updatedById: string,
): Promise<ActionResult<{ id: string }>> {
  const flight = await prisma.flight.findUnique({
    where: { id },
    include: { airplane: { select: { identifier: true, economySeats: true, firstClassSeats: true } } },
  });
  if (!flight) return { ok: false, error: "El vuelo no existe." };
  if (flight.status === "CANCELLED") {
    return { ok: false, error: "No se puede modificar un vuelo cancelado." };
  }
  if (flight.departureAt <= new Date()) {
    return { ok: false, error: "No se puede modificar un vuelo que ya partió." };
  }

  // US-05: reasignación de avión. Si no se indica, se mantiene el actual.
  const changingAirplane = data.airplaneId !== undefined && data.airplaneId !== flight.airplaneId;
  let targetAirplane = flight.airplane;
  let targetAirplaneId = flight.airplaneId;
  if (changingAirplane) {
    const airplane = await prisma.airplane.findUnique({ where: { id: data.airplaneId } });
    if (!airplane || !airplane.isActive) {
      return { ok: false, error: "El avión seleccionado no existe o está inactivo." };
    }
    targetAirplane = airplane;
    targetAirplaneId = airplane.id;
  }

  const fieldErrors: FieldErrors = { ...capacityAboveSeatsErrors(data, targetAirplane) };
  if (data.economyCapacity < flight.economyOccupied) {
    fieldErrors.economyCapacity = [
      `No puede ser menor a los ${flight.economyOccupied} pasajes Economy ya vendidos`,
    ];
  }
  if (data.firstClassCapacity < flight.firstClassOccupied) {
    fieldErrors.firstClassCapacity = [
      `No puede ser menor a los ${flight.firstClassOccupied} pasajes de Primera ya vendidos`,
    ];
  }

  // US-05: el avión reasignado no puede tener menos capacidad que lo ya vendido.
  if (changingAirplane) {
    if (targetAirplane.economySeats < flight.economyOccupied) {
      fieldErrors.airplaneId = [
        `El avión ${targetAirplane.identifier} tiene menos asientos Economy (${targetAirplane.economySeats}) que los ${flight.economyOccupied} pasajes vendidos`,
      ];
    } else if (targetAirplane.firstClassSeats < flight.firstClassOccupied) {
      fieldErrors.airplaneId = [
        `El avión ${targetAirplane.identifier} tiene menos asientos de Primera (${targetAirplane.firstClassSeats}) que los ${flight.firstClassOccupied} pasajes vendidos`,
      ];
    }
  }
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  // US-05: nuevo horario. Si no se envían horarios, se conservan los actuales.
  const hasNewTimes = data.departureTime !== undefined && data.arrivalTime !== undefined;
  const newWindow = hasNewTimes
    ? buildWindowFromTimes(flight.date, data.departureTime as string, data.arrivalTime as string)
    : { departureAt: flight.departureAt, arrivalAt: flight.arrivalAt };
  const scheduleChanged =
    newWindow.departureAt.getTime() !== flight.departureAt.getTime() ||
    newWindow.arrivalAt.getTime() !== flight.arrivalAt.getTime();

  // US-05: si cambia el avión o el horario, el avión destino no puede quedar
  // con otro vuelo superpuesto en la nueva ventana.
  if (changingAirplane || scheduleChanged) {
    const conflict = await prisma.flight.findFirst({
      where: {
        id: { not: flight.id },
        airplaneId: targetAirplaneId,
        status: { not: "CANCELLED" },
        departureAt: { lt: newWindow.arrivalAt },
        arrivalAt: { gt: newWindow.departureAt },
      },
      select: { code: true },
    });
    if (conflict) {
      return {
        ok: false,
        error: `El avión ${targetAirplane.identifier} ya tiene el vuelo ${conflict.code} superpuesto en ese horario.`,
      };
    }
  }

  const hasSales = flight.economyOccupied > 0 || flight.firstClassOccupied > 0;
  // US-05/RF-10: si había ventas y cambia el horario, se registra el cambio de
  // contingencia con los valores anteriores y nuevos.
  const registerChange = scheduleChanged && hasSales;

  try {
    await prisma.$transaction(async (tx) => {
      if (registerChange) {
        await tx.flightChange.create({
          data: {
            id: newId("FlightChange"),
            flightId: flight.id,
            type: "SCHEDULE_CHANGE",
            previousDepartureAt: flight.departureAt,
            previousArrivalAt: flight.arrivalAt,
            newDepartureAt: newWindow.departureAt,
            newArrivalAt: newWindow.arrivalAt,
            createdById: updatedById,
          },
        });
      }

      const { count } = await tx.flight.updateMany({
        where: {
          id,
          status: "SCHEDULED",
          economyOccupied: { lte: data.economyCapacity },
          firstClassOccupied: { lte: data.firstClassCapacity },
        },
        data: {
          economyCapacity: data.economyCapacity,
          firstClassCapacity: data.firstClassCapacity,
          economyFare: data.economyFare,
          firstClassFare: data.firstClassFare,
          departureAt: newWindow.departureAt,
          arrivalAt: newWindow.arrivalAt,
          airplaneId: targetAirplaneId,
          updatedById,
        },
      });
      if (count === 0) throw new Error("FLIGHT_CHANGED");
    });
  } catch {
    return {
      ok: false,
      error: "El vuelo cambió mientras lo editabas (nuevas ventas o cancelación). Volvé a intentarlo.",
    };
  }

  return { ok: true, data: { id } };
}
