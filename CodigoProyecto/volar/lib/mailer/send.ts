import { prisma } from "@/lib/prisma";
import { ContingencyResolution } from "@/generated/prisma/enums";
import type { EmailNotificationModel } from "@/generated/prisma/models/EmailNotification";
import type { FlightChangeModel } from "@/generated/prisma/models/FlightChange";
import { createMailerTransport } from "./index";
import { buildContingencyEmailContent } from "./templates";

type FlightChangeWithFlightCode = FlightChangeModel & {
  flight?: { code: string } | null;
};

/**
 * US-25/US-26: enlace absoluto a la pantalla pública de resolución. El token
 * viaja como segmento de ruta (`/contingencia/{token}`), que es el contrato que
 * expone `app/contingencia/[token]/page.tsx`; nunca como query string.
 */
export function buildContingencyActionUrl(
  actionUrl: string,
  accessToken: string,
): string {
  const url = new URL(actionUrl);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/${encodeURIComponent(accessToken)}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export async function sendContingencyEmail(
  notification: EmailNotificationModel,
  change: FlightChangeWithFlightCode,
  actionUrl: string,
): Promise<"SENT" | "FAILED" | "SKIPPED"> {
  if (notification.status !== "PENDING") return "SKIPPED";

  // Defensa en profundidad: el dispatcher ya filtra por tipo, pero ningún
  // llamador debe enviar otro email (p. ej. REBOOKING_CONFIRMATION) con esta
  // plantilla de contingencia.
  if (
    notification.type !== "FLIGHT_CANCELLATION" &&
    notification.type !== "FLIGHT_SCHEDULE_CHANGE"
  ) {
    return "SKIPPED";
  }

  // M7: sin `bookingId` no se puede acotar la consulta de tokens. Se omite la
  // fila en lugar de consultar contingencias de otras reservas.
  if (!notification.bookingId) return "SKIPPED";

  // M6: solo los tokens todavía accionables. Un email sin enlaces útiles no se
  // envía: sería un mensaje sin acción posible.
  const tokens = await prisma.ticketContingency.findMany({
    where: {
      flightChangeId: change.id,
      resolution: ContingencyResolution.PENDING,
      ticket: { bookingId: notification.bookingId },
    },
    select: { accessToken: true },
  });

  if (tokens.length === 0) {
    // La contingencia ya fue resuelta (o no tiene tokens accionables). Dejar
    // la fila en PENDING haría que cada `mail:send` la revisara para siempre.
    await prisma.emailNotification.update({
      where: { id: notification.id },
      data: {
        status: "FAILED",
        lastError: "La contingencia ya no tiene acciones pendientes para este comprador.",
      },
    });
    return "SKIPPED";
  }

  const flightCode =
    change.flight?.code ??
    (await prisma.flight.findUnique({ where: { id: change.flightId }, select: { code: true } }))
      ?.code;

  if (!flightCode) {
    throw new Error("No se encontró el vuelo asociado al cambio.");
  }

  const actionLinks = tokens.map((token) => ({
    accessToken: token.accessToken,
    url: buildContingencyActionUrl(actionUrl, token.accessToken),
  }));

  const { text, html } = buildContingencyEmailContent(
    change.type,
    flightCode,
    change.previousDepartureAt,
    change.previousArrivalAt,
    change.newDepartureAt,
    change.newArrivalAt,
    actionLinks,
  );

  const transport = createMailerTransport();

  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM,
      to: notification.recipientEmail,
      subject: notification.subject,
      text,
      html,
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
