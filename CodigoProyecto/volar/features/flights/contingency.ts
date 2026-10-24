import { randomUUID } from "node:crypto";
import { newId } from "@/lib/id";

export type ContingencyFlightChangeType = "SCHEDULE_CHANGE" | "CANCELLATION";
export type ContingencyEmailType = "FLIGHT_SCHEDULE_CHANGE" | "FLIGHT_CANCELLATION";

export type AffectedTicket = {
  id: string;
  booking: { id: string; contactEmail: string };
};

export type ContingencyOutboxEmail = {
  id: string;
  emailType: ContingencyEmailType;
  recipientEmail: string;
  subject: string;
  body: string;
  bookingId: string;
  flightChangeId: string;
  status: "PENDING";
};

export type ContingencyOutbox = {
  contingencies: {
    id: string;
    flightChangeId: string;
    ticketId: string;
    accessToken: string;
  }[];
  emails: ContingencyOutboxEmail[];
};

export type EmailNotificationInput = {
  id: string;
  type: ContingencyEmailType;
  recipientEmail: string;
  subject: string;
  bookingId: string;
  flightChangeId: string;
  status: "PENDING";
};

/**
 * Convierte un email del outbox en el input esperado por Prisma para
 * `emailNotification.createMany`. El cuerpo no se persiste en Task 4: se
 * regenerará en Task 5 a partir del FlightChange y las TicketContingency.
 */
export function emailNotificationInput(email: ContingencyOutboxEmail): EmailNotificationInput {
  return {
    id: email.id,
    type: email.emailType,
    recipientEmail: email.recipientEmail,
    subject: email.subject,
    bookingId: email.bookingId,
    flightChangeId: email.flightChangeId,
    status: email.status,
  };
}

type BuildContingencyOutboxArgs = {
  flightChangeId: string;
  type: ContingencyFlightChangeType;
  flightCode: string;
  tickets: AffectedTicket[];
  previousDepartureAt: Date;
  previousArrivalAt: Date;
  newDepartureAt?: Date | null;
  newArrivalAt?: Date | null;
};

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
}

function buildSubject(type: ContingencyFlightChangeType, flightCode: string): string {
  if (type === "SCHEDULE_CHANGE") {
    return `Cambio de horario en tu vuelo ${flightCode}`;
  }
  return `Cancelación de tu vuelo ${flightCode}`;
}

function buildBody(
  type: ContingencyFlightChangeType,
  flightCode: string,
  previousDepartureAt: Date,
  previousArrivalAt: Date,
  newDepartureAt?: Date | null,
  newArrivalAt?: Date | null,
): string {
  if (type === "SCHEDULE_CHANGE" && newDepartureAt && newArrivalAt) {
    return [
      `Te informamos que el vuelo ${flightCode} cambió de horario.`,
      "",
      `Horario anterior: ${formatDateTime(previousDepartureAt)} - ${formatDateTime(previousArrivalAt)}`,
      `Nuevo horario: ${formatDateTime(newDepartureAt)} - ${formatDateTime(newArrivalAt)}`,
      "",
      "Si el nuevo horario no te sirve, podés elegir reprogramación o reembolso a través del enlace que te enviaremos.",
    ].join("\n");
  }

  return [
    `Lamentamos informarte que el vuelo ${flightCode} fue cancelado.`,
    "",
    "Podés elegir reprogramación o reembolso a través del enlace que te enviaremos.",
  ].join("\n");
}

function generateUniqueAccessTokens(count: number): string[] {
  const tokens = new Set<string>();
  while (tokens.size < count) {
    tokens.add(randomUUID());
  }
  return [...tokens];
}

/**
 * US-06 / US-25: arma el "outbox" de una contingencia a partir de los pasajes
 * ya emitidos de un vuelo.
 *
 * - Una TicketContingency por pasaje, con accessToken único para que el
 *   pasajero elija reprogramación o reembolso (US-26).
 * - Una EmailNotification PENDING por comprador (deduplicada por booking).
 * - Distinto asunto/cuerpo para cambios de horario y cancelaciones.
 * - No genera registros duplicados para el mismo par (flightChangeId, ticketId).
 */
export function buildContingencyOutbox({
  flightChangeId,
  type,
  flightCode,
  tickets,
  previousDepartureAt,
  previousArrivalAt,
  newDepartureAt,
  newArrivalAt,
}: BuildContingencyOutboxArgs): ContingencyOutbox {
  const seen = new Set<string>();
  const uniqueTickets = tickets.filter((ticket) => {
    if (seen.has(ticket.id)) return false;
    seen.add(ticket.id);
    return true;
  });
  const accessTokens = generateUniqueAccessTokens(uniqueTickets.length);

  const emailType: ContingencyEmailType =
    type === "SCHEDULE_CHANGE" ? "FLIGHT_SCHEDULE_CHANGE" : "FLIGHT_CANCELLATION";
  const subject = buildSubject(type, flightCode);
  const body = buildBody(
    type,
    flightCode,
    previousDepartureAt,
    previousArrivalAt,
    newDepartureAt,
    newArrivalAt,
  );

  const contingencies = uniqueTickets.map((ticket, index) => ({
    id: newId("TicketContingency"),
    flightChangeId,
    ticketId: ticket.id,
    accessToken: accessTokens[index]!,
  }));

  const emailsByBooking = new Map<string, ContingencyOutboxEmail>();
  for (const ticket of uniqueTickets) {
    if (!emailsByBooking.has(ticket.booking.id)) {
      emailsByBooking.set(ticket.booking.id, {
        id: newId("EmailNotification"),
        emailType,
        recipientEmail: ticket.booking.contactEmail,
        subject,
        body,
        bookingId: ticket.booking.id,
        flightChangeId,
        status: "PENDING",
      });
    }
  }

  return { contingencies, emails: [...emailsByBooking.values()] };
}
