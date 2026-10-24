"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { resolveRebooking, resolveRefund } from "./contingency-resolution";

export async function resolveRefundAction(
  accessToken: string,
): Promise<ActionResult<{ refundId: string; amount: number; gatewayRefundId: string }>> {
  if (!accessToken || accessToken.trim().length === 0) {
    return { ok: false, error: "El enlace no es válido." };
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
 * pública. Igual que el reembolso, el token es el único secreto de acceso y
 * los errores internos se traducen a mensajes genéricos.
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
