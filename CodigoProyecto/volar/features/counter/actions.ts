"use server";

import { prisma } from "@/lib/prisma";
import { requireCounterAgent } from "@/lib/auth";
import { sendPurchaseConfirmationEmail } from "@/lib/mailer/purchase";
import type { ActionResult } from "@/lib/action-result";
import { counterSaleSchema, type CounterSaleValues } from "./schema";
import { createCounterSale } from "./service";

/**
 * US-33: registra la venta presencial. Si se indicó email de contacto, envía
 * los comprobantes (igual que `processPaymentAction` en la compra web): el
 * envío es best-effort y nunca convierte una venta exitosa en un error.
 */
export async function createCounterSaleAction(
  values: CounterSaleValues,
): Promise<ActionResult<{ code: string }>> {
  const agent = await requireCounterAgent();

  const parsed = counterSaleSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      (fieldErrors[issue.path.join(".")] ??= []).push(issue.message);
    }
    return { ok: false, error: "Revisá los datos de la venta.", fieldErrors };
  }

  const result = await createCounterSale(parsed.data, agent);

  if (result.ok && parsed.data.contactEmail) {
    try {
      const notification = await prisma.emailNotification.findFirst({
        where: {
          type: "PURCHASE_CONFIRMATION",
          status: "PENDING",
          booking: { code: result.data.code },
        },
        orderBy: { createdAt: "desc" },
      });
      if (notification) await sendPurchaseConfirmationEmail(notification, result.data.code);
    } catch (error) {
      console.error("No se pudo enviar la confirmación de la venta de mostrador:", error);
    }
  }

  return result;
}
