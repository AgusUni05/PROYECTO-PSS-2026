import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/id";
import type { ActionResult } from "@/lib/action-result";
import type { AirportFormValues } from "./schema";

const DUPLICATE_CODE: ActionResult<never> = {
  ok: false,
  fieldErrors: { code: ["Ya existe un aeropuerto con este código"] },
};

/** US-01: alta de aeropuerto. Código único (incluye inactivos). */
export async function createAirport(
  data: AirportFormValues,
): Promise<ActionResult<{ id: string }>> {
  const existing = await prisma.airport.findUnique({ where: { code: data.code } });
  if (existing) return DUPLICATE_CODE;

  try {
    const airport = await prisma.airport.create({ data: { id: newId("Airport"), ...data } });
    return { ok: true, data: { id: airport.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return DUPLICATE_CODE;
    }
    throw err;
  }
}

/** US-01: modificación de aeropuerto. Código único excluyendo el propio registro. */
export async function updateAirport(
  id: string,
  data: AirportFormValues,
): Promise<ActionResult<{ id: string }>> {
  const existing = await prisma.airport.findFirst({ where: { code: data.code, NOT: { id } } });
  if (existing) return DUPLICATE_CODE;

  try {
    const airport = await prisma.airport.update({ where: { id }, data });
    return { ok: true, data: { id: airport.id } };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return DUPLICATE_CODE;
    }
    throw err;
  }
}

/** US-01: baja lógica. Bloqueada si el aeropuerto tiene vuelos futuros programados. */
export async function deactivateAirport(id: string): Promise<ActionResult<{ id: string }>> {
  const futureFlights = await prisma.flight.count({
    where: {
      status: "SCHEDULED",
      departureAt: { gt: new Date() },
      route: { OR: [{ originId: id }, { destinationId: id }] },
    },
  });
  if (futureFlights > 0) {
    return {
      ok: false,
      error: "No se puede dar de baja: el aeropuerto tiene vuelos futuros programados.",
    };
  }

  await prisma.airport.update({ where: { id }, data: { isActive: false } });
  return { ok: true, data: { id } };
}
