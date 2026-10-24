import { prisma } from "@/lib/prisma";
import type { EmailType } from "@/generated/prisma/enums";
import { sendContingencyEmail } from "./send";
import { sendPurchaseConfirmationEmail } from "./purchase";

export type DispatchSummary = {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
};

/**
 * Tipos de email que este comando puede despachar. Es una allowlist explícita:
 * las confirmaciones de reprogramación (`REBOOKING_CONFIRMATION`) no se envían
 * en Sprint 3 (no hay plantilla propia) y el dominio las crea ya `FAILED`, así
 * que nunca entran en esta cola.
 */
export const CONTINGENCY_EMAIL_TYPES: EmailType[] = [
  "FLIGHT_CANCELLATION",
  "FLIGHT_SCHEDULE_CHANGE",
];

/**
 * US-25: despacha el outbox de contingencias. Recorre las notificaciones
 * PENDING de tipo contingencia en orden de creación y delega el envío en
 * `sendContingencyEmail`, que es quien actualiza el estado de cada fila. Una
 * fila fallida nunca aborta el resto del lote, y una notificación sin cambio
 * de vuelo asociado se cuenta como fallida pero se deja PENDING para revisión
 * manual.
 */
export async function dispatchPendingContingencyEmails(
  baseUrl: string,
): Promise<DispatchSummary> {
  const notifications = await prisma.emailNotification.findMany({
    where: { status: "PENDING", type: { in: CONTINGENCY_EMAIL_TYPES } },
    include: { flightChange: { include: { flight: true } } },
    orderBy: { createdAt: "asc" },
  });

  const actionUrl = new URL("/contingencia", baseUrl).toString();
  const summary: DispatchSummary = { processed: 0, sent: 0, failed: 0, skipped: 0 };

  for (const notification of notifications) {
    summary.processed += 1;

    if (!notification.flightChange) {
      summary.failed += 1;
      console.error(
        `No se pudo despachar la notificación ${notification.id}: no tiene un cambio de vuelo asociado.`,
      );
      continue;
    }

    try {
      const outcome = await sendContingencyEmail(
        notification,
        notification.flightChange,
        actionUrl,
      );

      if (outcome === "SENT") {
        summary.sent += 1;
      } else if (outcome === "FAILED") {
        summary.failed += 1;
      } else {
        summary.skipped += 1;
      }
    } catch (error) {
      summary.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`No se pudo despachar la notificación ${notification.id}: ${message}`);
    }
  }

  return summary;
}

/**
 * Una confirmación de compra fallida se puede reintentar con `pnpm mail:send`
 * hasta este límite, para no reintentar para siempre un error permanente.
 */
export const PURCHASE_EMAIL_RETRY_LIMIT = 5;

/**
 * US-24/RNF-02: despacha las confirmaciones de compra que quedaron en el
 * outbox (por ejemplo, si SMTP no estaba configurado al aprobar el pago o si
 * el envío inmediato falló). Cada fila se procesa de forma independiente.
 */
export async function dispatchPendingPurchaseEmails(): Promise<DispatchSummary> {
  const notifications = await prisma.emailNotification.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: PURCHASE_EMAIL_RETRY_LIMIT },
      type: "PURCHASE_CONFIRMATION",
    },
    include: { booking: { select: { code: true } } },
    orderBy: { createdAt: "asc" },
  });

  const summary: DispatchSummary = { processed: 0, sent: 0, failed: 0, skipped: 0 };

  for (const notification of notifications) {
    summary.processed += 1;

    if (!notification.booking?.code) {
      summary.failed += 1;
      console.error(
        `No se pudo despachar la confirmación ${notification.id}: no tiene una reserva asociada.`,
      );
      continue;
    }

    try {
      const outcome = await sendPurchaseConfirmationEmail(
        notification,
        notification.booking.code,
      );

      if (outcome === "SENT") {
        summary.sent += 1;
      } else if (outcome === "FAILED") {
        summary.failed += 1;
      } else {
        summary.skipped += 1;
      }
    } catch (error) {
      summary.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `No se pudo despachar la confirmación ${notification.id}: ${message}`,
      );
    }
  }

  return summary;
}
