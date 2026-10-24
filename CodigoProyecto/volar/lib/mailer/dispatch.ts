import { prisma } from "@/lib/prisma";
import { sendContingencyEmail } from "./send";

export type DispatchSummary = {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
};

/**
 * US-25: despacha el outbox de contingencias. Recorre las notificaciones
 * PENDING en orden de creación y delega el envío en `sendContingencyEmail`,
 * que es quien actualiza el estado de cada fila. Una fila fallida nunca
 * aborta el resto del lote, y una notificación sin cambio de vuelo asociado
 * se cuenta como fallida pero se deja PENDING para revisión manual.
 */
export async function dispatchPendingContingencyEmails(
  baseUrl: string,
): Promise<DispatchSummary> {
  const notifications = await prisma.emailNotification.findMany({
    where: { status: "PENDING" },
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
