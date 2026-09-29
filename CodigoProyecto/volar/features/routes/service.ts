import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/id";
import type { ActionResult } from "@/lib/action-result";
import type { RouteFormValues } from "./schema";

const INVALID_AIRPORTS: ActionResult<never> = {
  ok: false,
  error: "El origen y el destino deben ser aeropuertos activos existentes.",
};

const SOLD_TICKETS_ERROR =
  "No se puede modificar: el trayecto tiene pasajes vendidos. Cancelalo en su lugar.";

/** Vuelos ya vendidos (con e-tickets emitidos) sobre algún vuelo de este trayecto. */
async function routeHasSoldTickets(routeId: string): Promise<boolean> {
  const count = await prisma.ticket.count({
    where: { status: "ISSUED", flight: { routeId } },
  });
  return count > 0;
}

async function bothAirportsActive(originId: string, destinationId: string): Promise<boolean> {
  const count = await prisma.airport.count({
    where: { id: { in: [originId, destinationId] }, isActive: true },
  });
  return count === 2;
}

/** Próximo código correlativo TR-00N a partir del último trayecto creado. */
async function nextRouteCode(): Promise<string> {
  const last = await prisma.route.findFirst({ orderBy: { code: "desc" }, select: { code: true } });
  const lastNumber = last ? Number(last.code.replace("TR-", "")) : 0;
  return `TR-${String(lastNumber + 1).padStart(3, "0")}`;
}

/** US-03: alta de trayecto. Origen y destino deben existir y estar activos. */
export async function createRoute(data: RouteFormValues): Promise<ActionResult<{ id: string }>> {
  if (!(await bothAirportsActive(data.originId, data.destinationId))) {
    return INVALID_AIRPORTS;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = await nextRouteCode();
    try {
      const route = await prisma.route.create({ data: { id: newId("Route"), code, ...data } });
      return { ok: true, data: { id: route.id } };
    } catch (err) {
      const isCodeCollision =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        (err.meta?.target as string[] | undefined)?.includes("code");
      if (!isCodeCollision) throw err;
      // Otro alta concurrente tomó ese código: reintentar con el siguiente.
    }
  }
  return { ok: false, error: "No se pudo generar un código de trayecto único. Reintentá." };
}

/** US-03: modificación de trayecto. Bloqueada si ya tiene pasajes vendidos. */
export async function updateRoute(
  id: string,
  data: RouteFormValues,
): Promise<ActionResult<{ id: string }>> {
  if (await routeHasSoldTickets(id)) {
    return { ok: false, error: SOLD_TICKETS_ERROR };
  }
  if (!(await bothAirportsActive(data.originId, data.destinationId))) {
    return INVALID_AIRPORTS;
  }

  const route = await prisma.route.update({ where: { id }, data });
  return { ok: true, data: { id: route.id } };
}

/** US-03: baja lógica. Bloqueada si el trayecto tiene pasajes vendidos. */
export async function deactivateRoute(id: string): Promise<ActionResult<{ id: string }>> {
  if (await routeHasSoldTickets(id)) {
    return {
      ok: false,
      error: "No se puede dar de baja: el trayecto tiene pasajes vendidos. Cancelalo en su lugar.",
    };
  }

  await prisma.route.update({ where: { id }, data: { isActive: false } });
  return { ok: true, data: { id } };
}
