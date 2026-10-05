import { prisma } from "@/lib/prisma";

/**
 * Pasa a COMPLETED los vuelos programados cuya salida ya ocurrió. Es idempotente
 * (solo toca SCHEDULED con `departureAt` vencido) y se llama al listar vuelos,
 * así el estado queda al día sin necesidad de un proceso programado.
 */
export async function completePastFlights(now: Date = new Date()): Promise<number> {
  const { count } = await prisma.flight.updateMany({
    where: { status: "SCHEDULED", departureAt: { lte: now } },
    data: { status: "COMPLETED" },
  });
  return count;
}
