import { prisma } from "@/lib/prisma";
import type { EmailNotificationModel } from "@/generated/prisma/models/EmailNotification";
import type { FlightChangeModel } from "@/generated/prisma/models/FlightChange";
import { createMailerTransport } from "./index";
import { buildContingencyEmailContent } from "./templates";

type FlightChangeWithFlightCode = FlightChangeModel & {
  flight?: { code: string } | null;
};

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

  const flightCode =
    change.flight?.code ??
    (await prisma.flight.findUnique({ where: { id: change.flightId }, select: { code: true } }))
      ?.code;

  if (!flightCode) {
    throw new Error("No se encontró el vuelo asociado al cambio.");
  }

  const tokens = await prisma.ticketContingency.findMany({
    where: {
      flightChangeId: change.id,
      ticket: { bookingId: notification.bookingId ?? undefined },
    },
    select: { accessToken: true },
  });

  const actionLinks = tokens.map((token) => {
    const url = new URL(actionUrl);
    url.searchParams.set("token", token.accessToken);
    return { accessToken: token.accessToken, url: url.toString() };
  });

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
