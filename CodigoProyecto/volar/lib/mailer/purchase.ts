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

const BUENOS_AIRES_TIMEZONE = "America/Argentina/Buenos_Aires";

const PURCHASE_DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: BUENOS_AIRES_TIMEZONE,
});

const SLOGAN = "Volá por Argentina con VolAR.";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(amount: string): string {
  return Number(amount).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatSeatClass(seatClass: string): string {
  if (seatClass === "FIRST") return "Primera clase";
  return "Economy";
}

function purchaseEmailText(purchase: NonNullable<Awaited<ReturnType<typeof getBookingComprobantes>>>) {
  const route = `${purchase.flight.origin.city} (${purchase.flight.origin.code}) → ${purchase.flight.destination.city} (${purchase.flight.destination.code})`;
  const flightDate = PURCHASE_DATE_FORMATTER.format(purchase.flight.departureAt);

  return [
    SLOGAN,
    "",
    "¡Gracias por comprar en VolAR!",
    "",
    `Tu compra fue confirmada. Código de reserva: ${purchase.code}.`,
    "",
    "Detalle del vuelo",
    `Ruta: ${route}`,
    `Fecha y hora: ${flightDate}`,
    `Clase: ${formatSeatClass(purchase.seatClass)}`,
    `Pasajes: ${purchase.quantity}`,
    `Total: ${formatCurrency(purchase.totalAmount)}`,
    "",
    "Adjuntamos tus pasajes electrónicos y, si corresponde, la factura de la compra.",
    "",
    "Podés volver a descargarlos cuando quieras desde Mis Compras.",
  ].join("\n");
}

function purchaseEmailHtml(purchase: NonNullable<Awaited<ReturnType<typeof getBookingComprobantes>>>) {
  const route = `${purchase.flight.origin.city} (${purchase.flight.origin.code}) → ${purchase.flight.destination.city} (${purchase.flight.destination.code})`;
  const flightDate = escapeHtml(PURCHASE_DATE_FORMATTER.format(purchase.flight.departureAt));
  const primaryColor = "#5530E0";
  const darkColor = "#16133D";
  const lightColor = "#F1EDFF";
  const whiteColor = "#FFFFFF";
  const mutedColor = "#6B7280";
  const borderColor = "#E5E7EB";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tu compra fue confirmada — VolAR</title>
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F9FAFB;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:${whiteColor};border-radius:12px;overflow:hidden;border:1px solid ${borderColor};">
          <tr>
            <td style="padding:24px 24px 16px;background:${primaryColor};color:${whiteColor};text-align:center;">
              <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px;">VolAR</div>
              <div style="margin-top:4px;font-size:13px;opacity:0.95;">${escapeHtml(SLOGAN)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:20px;font-weight:700;color:${darkColor};line-height:1.3;">
                    ¡Gracias por comprar en VolAR!
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:8px;font-size:16px;color:${mutedColor};line-height:1.5;">
                    Tu compra fue confirmada.
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${lightColor};border-radius:8px;">
                      <tr>
                        <td style="padding:16px;color:${darkColor};font-size:14px;line-height:1.5;">
                          Código de reserva<br />
                          <span style="font-size:22px;font-weight:800;">${escapeHtml(purchase.code)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FAFAFA;border-radius:8px;">
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid ${borderColor};color:${darkColor};font-size:16px;line-height:1.5;">
                          Ruta<br />
                          <span style="font-weight:700;">${escapeHtml(route)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid ${borderColor};color:${darkColor};font-size:16px;line-height:1.5;">
                          Fecha y hora de salida<br />
                          <span style="font-weight:700;">${flightDate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid ${borderColor};color:${darkColor};font-size:16px;line-height:1.5;">
                          Clase<br />
                          <span style="font-weight:700;">${escapeHtml(formatSeatClass(purchase.seatClass))}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid ${borderColor};color:${darkColor};font-size:16px;line-height:1.5;">
                          Pasajes<br />
                          <span style="font-weight:700;">${purchase.quantity}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;color:${darkColor};font-size:16px;line-height:1.5;">
                          Total<br />
                          <span style="font-weight:700;">${escapeHtml(formatCurrency(purchase.totalAmount))}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:24px;font-size:15px;color:${darkColor};line-height:1.6;">
                    Adjuntamos tus pasajes electrónicos y, si corresponde, la factura de la compra.
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:8px;font-size:15px;color:${darkColor};line-height:1.6;">
                    Podés volver a descargarlos cuando quieras desde <strong>Mis Compras</strong>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
      text: purchaseEmailText(purchase),
      html: purchaseEmailHtml(purchase),
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
