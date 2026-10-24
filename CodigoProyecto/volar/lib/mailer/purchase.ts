import type { EmailNotificationModel } from "@/generated/prisma/models/EmailNotification";
import { prisma } from "@/lib/prisma";
import {
  buildETicketsFilename,
  buildETicketsPdf,
  buildInvoiceFilename,
  buildInvoicePdf,
} from "@/features/purchase/documents";
import { getBookingComprobantes } from "@/features/purchase/queries";
import { createMailerTransport } from "./index";

type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

function purchaseEmailText(bookingCode: string): string {
  return [
    "¡Gracias por comprar en VolAR!",
    "",
    `Tu compra fue confirmada. Código de reserva: ${bookingCode}.`,
    "Adjuntamos tus pasajes electrónicos y, si corresponde, la factura de la compra.",
    "",
    "Podés volver a descargarlos cuando quieras desde Mis Compras.",
  ].join("\n");
}

function purchaseEmailHtml(bookingCode: string): string {
  return `
    <p>¡Gracias por comprar en VolAR!</p>
    <p>Tu compra fue confirmada. <strong>Código de reserva: ${bookingCode}</strong>.</p>
    <p>Adjuntamos tus pasajes electrónicos y, si corresponde, la factura de la compra.</p>
    <p>Podés volver a descargarlos cuando quieras desde <strong>Mis Compras</strong>.</p>
  `.trim();
}

/**
 * US-24/RNF-02: envía la confirmación de compra con los comprobantes PDF
 * adjuntos. Sólo procesa filas PENDING de tipo PURCHASE_CONFIRMATION. El
 * transporte se crea antes del try para que una configuración SMTP incompleta
 * deje la fila PENDING y pueda reintentarse con `pnpm mail:send`.
 */
export async function sendPurchaseConfirmationEmail(
  notification: EmailNotificationModel,
  bookingCode: string,
): Promise<"SENT" | "FAILED" | "SKIPPED"> {
  if (notification.status !== "PENDING" && notification.status !== "FAILED") {
    return "SKIPPED";
  }
  if (notification.type !== "PURCHASE_CONFIRMATION") return "SKIPPED";
  if (!notification.bookingId) return "SKIPPED";

  const purchase = await getBookingComprobantes(bookingCode);
  if (!purchase) {
    await prisma.emailNotification.update({
      where: { id: notification.id },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
        lastError: `No se encontró la reserva ${bookingCode}.`,
      },
    });
    return "FAILED";
  }

  const attachments: MailAttachment[] = [
    {
      filename: buildETicketsFilename(purchase.code),
      content: Buffer.from(await buildETicketsPdf(purchase)),
      contentType: "application/pdf",
    },
  ];

  if (purchase.invoice) {
    attachments.push({
      filename: buildInvoiceFilename(purchase.code),
      content: Buffer.from(await buildInvoicePdf(purchase)),
      contentType: "application/pdf",
    });
  }

  const transport = createMailerTransport();

  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM,
      to: notification.recipientEmail,
      subject: notification.subject,
      text: purchaseEmailText(purchase.code),
      html: purchaseEmailHtml(purchase.code),
      attachments,
    });

    await prisma.emailNotification.update({
      where: { id: notification.id },
      data: {
        status: "SENT",
        attempts: { increment: 1 },
        sentAt: new Date(),
        lastError: null,
      },
    });

    return "SENT";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await prisma.emailNotification.update({
      where: { id: notification.id },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
        lastError: message,
      },
    });

    return "FAILED";
  }
}
