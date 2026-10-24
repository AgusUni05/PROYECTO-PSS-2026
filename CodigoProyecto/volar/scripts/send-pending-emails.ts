/**
 * Despacha las notificaciones de contingencia que quedaron en estado PENDING
 * (US-25). Pensado para ejecutarse a mano o desde un cron:
 *
 *   pnpm mail:send
 *
 * Requiere SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD y MAIL_FROM. Si esa
 * configuración falta, el transporte no se puede crear: cada fila se reporta
 * como fallida y permanece PENDING, así que se puede reintentar el mismo
 * comando después de completar las variables. Nunca imprime cuerpos de email
 * ni credenciales.
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import {
  dispatchPendingContingencyEmails,
  dispatchPendingPurchaseEmails,
} from "../lib/mailer/dispatch";

async function main() {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const contingencySummary = await dispatchPendingContingencyEmails(appUrl);
  const purchaseSummary = await dispatchPendingPurchaseEmails();

  console.log(
    `Emails de contingencia: ${contingencySummary.processed} procesados, ${contingencySummary.sent} enviados, ${contingencySummary.failed} fallidos, ${contingencySummary.skipped} omitidos.`,
  );
  console.log(
    `Emails de compra: ${purchaseSummary.processed} procesados, ${purchaseSummary.sent} enviados, ${purchaseSummary.failed} fallidos, ${purchaseSummary.skipped} omitidos.`,
  );
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`No se pudieron despachar los emails pendientes: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
