"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { resolveRefund } from "./contingency-resolution";

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
