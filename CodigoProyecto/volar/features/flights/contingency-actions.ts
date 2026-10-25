"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";
import { canPassengerAccessBooking } from "@/lib/auth";
import { resolveRebooking, resolveRefund } from "./contingency-resolution";

async function checkContingencyAccess(
  accessToken: string,
): Promise<ActionResult<null>> {
  const contingency = await prisma.ticketContingency.findUnique({
    where: { accessToken },
    include: {
      ticket: {
        include: {
          booking: {
            select: { buyerId: true, contactEmail: true },
          },
        },
      },
    },
  });

  if (!contingency) {
    return { ok: false, error: "El enlace no es válido o expiró." };
  }

  const allowed = await canPassengerAccessBooking(contingency.ticket.booking);
  if (!allowed) {
    return { ok: false, error: "Necesitás iniciar sesión para continuar." };
  }

  return { ok: true, data: null };
}

export async function resolveRefundAction(
  accessToken: string,
): Promise<ActionResult<{ refundId: string; amount: number; gatewayRefundId: string }>> {
  if (!accessToken || accessToken.trim().length === 0) {
    return { ok: false, error: "El enlace no es válido." };
  }

  const access = await checkContingencyAccess(accessToken);
  if (!access.ok) {
    return access;
  }

  try {
    const result = await resolveRefund(accessToken, {});

    switch (result.type) {
      case "ok": {
        revalidatePath(`/contingencia/${accessToken}`);
        return {
          ok: true,
          data: {
            refundId: result.refundId,
            amount: result.amount,
            gatewayRefundId: result.gatewayRefundId,
          },
        };
      }
      case "alreadyResolved": {
        revalidatePath(`/contingencia/${accessToken}`);
        return { ok: false, error: "Esta contingencia ya fue resuelta." };
      }
      case "notFound": {
        return { ok: false, error: "El enlace no es válido o expiró." };
      }
      case "conflict": {
        return { ok: false, error: "No se pudo procesar el reembolso. Volvé a intentarlo." };
      }
      default: {
        return { ok: false, error: "No se pudo procesar el reembolso." };
      }
    }
  } catch {
    return { ok: false, error: "No se pudo procesar el reembolso." };
  }
}

/**
 * US-26: reprograma el pasaje a un vuelo alternativo elegido en la pantalla
 * pública. El token sigue siendo el secreto de acceso, pero antes de actuar se
 * verifica que el pasajero autenticado tenga permiso sobre la reserva.
 */
export async function resolveRebookingAction(
  accessToken: string,
  newFlightId: string,
): Promise<ActionResult<{ ticketNumber: string; flightCode: string; seat: string }>> {
  if (!accessToken || accessToken.trim().length === 0) {
    return { ok: false, error: "El enlace no es válido." };
  }

  if (!newFlightId || newFlightId.trim().length === 0) {
    return { ok: false, error: "Elegí un vuelo alternativo." };
  }

  const access = await checkContingencyAccess(accessToken);
  if (!access.ok) {
    return access;
  }

  try {
    const result = await resolveRebooking(accessToken, newFlightId, {});

    switch (result.type) {
      case "ok": {
        revalidatePath(`/contingencia/${accessToken}`);
        return {
          ok: true,
          data: {
            ticketNumber: result.ticketNumber,
            flightCode: result.flightCode,
            seat: result.seat,
          },
        };
      }
      case "alreadyResolved": {
        revalidatePath(`/contingencia/${accessToken}`);
        return { ok: false, error: "Esta contingencia ya fue resuelta." };
      }
      case "notFound": {
        return { ok: false, error: "El enlace no es válido o expiró." };
      }
      case "conflict": {
        if (result.reason === "TICKET_NOT_ACTIVE") {
          return {
            ok: false,
            error: "Este pasaje ya no está activo. Revisá el estado de tu compra.",
          };
        }

        return {
          ok: false,
          error: "El vuelo elegido ya no está disponible. Elegí otra alternativa.",
        };
      }
      default: {
        return { ok: false, error: "No se pudo procesar la reprogramación." };
      }
    }
  } catch {
    return { ok: false, error: "No se pudo procesar la reprogramación." };
  }
}
