import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/id";
import type { ActionResult } from "@/lib/action-result";
import type { AirplaneFormValues } from "./schema";

const DUPLICATE_IDENTIFIER: ActionResult<never> = {
  ok: false,
  fieldErrors: { identifier: ["Ya existe un avión con este identificador"] },
};

/** US-02: alta de avión. Identificador único (incluye inactivos). */
export async function createAirplane(
  data: AirplaneFormValues,
): Promise<ActionResult<{ id: string }>> {
  const existing = await prisma.airplane.findUnique({ where: { identifier: data.identifier } });
  if (existing) return DUPLICATE_IDENTIFIER;

  try {
    const airplane = await prisma.airplane.create({ data: { id: newId("Airplane"), ...data } });
    return { ok: true, data: { id: airplane.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return DUPLICATE_IDENTIFIER;
    }
    throw err;
  }
}

/**
 * US-02: modificación de avión. Identificador único excluyendo el propio
 * registro; la capacidad de una clase no puede quedar por debajo de lo ya
 * vendido en un vuelo futuro programado.
 */
export async function updateAirplane(
  id: string,
  data: AirplaneFormValues,
): Promise<ActionResult<{ id: string }>> {
  const existing = await prisma.airplane.findFirst({
    where: { identifier: data.identifier, NOT: { id } },
  });
  if (existing) return DUPLICATE_IDENTIFIER;

  const overbooked = await prisma.flight.findFirst({
    where: {
      airplaneId: id,
      status: "SCHEDULED",
      departureAt: { gt: new Date() },
      OR: [
        { economyOccupied: { gt: data.economySeats } },
        { firstClassOccupied: { gt: data.firstClassSeats } },
      ],
    },
    select: { code: true },
  });
  if (overbooked) {
    return {
      ok: false,
      error: `No se puede reducir la capacidad: el vuelo ${overbooked.code} ya tiene más pasajes vendidos que los asientos nuevos.`,
    };
  }

  try {
    const airplane = await prisma.airplane.update({ where: { id }, data });
    return { ok: true, data: { id: airplane.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return DUPLICATE_IDENTIFIER;
    }
    throw err;
  }
}

/** US-02: baja lógica. Bloqueada si el avión tiene vuelos futuros asignados. */
export async function deactivateAirplane(id: string): Promise<ActionResult<{ id: string }>> {
  const futureFlights = await prisma.flight.count({
    where: { airplaneId: id, status: "SCHEDULED", departureAt: { gt: new Date() } },
  });
  if (futureFlights > 0) {
    return {
      ok: false,
      error: "No se puede dar de baja: el avión tiene vuelos futuros asignados.",
    };
  }

  await prisma.airplane.update({ where: { id }, data: { isActive: false } });
  return { ok: true, data: { id } };
}
