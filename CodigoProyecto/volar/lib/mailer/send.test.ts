import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import nodemailer from "nodemailer";
import { prismaMock } from "@/tests/prisma-mock";
import type { EmailNotificationModel } from "@/generated/prisma/models/EmailNotification";
import type { FlightChangeModel } from "@/generated/prisma/models/FlightChange";
import { sendContingencyEmail } from "./send";

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(),
  },
}));

const sendMail = vi.fn();

const originalEnv = process.env;

describe("sendContingencyEmail", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_SECURE = "false";
    process.env.SMTP_USER = "user@example.com";
    process.env.SMTP_PASSWORD = "secret";
    process.env.MAIL_FROM = "no-reply@volar.example.com";

    sendMail.mockReset();
    sendMail.mockResolvedValue({ messageId: "<msg>" });
    (nodemailer.createTransport as ReturnType<typeof vi.fn>).mockReturnValue({ sendMail });

    prismaMock.emailNotification.update.mockResolvedValue({} as never);
    prismaMock.ticketContingency.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const scheduleChange: FlightChangeModel & { flight: { code: string } } = {
    id: "CVU_1",
    flightId: "VUE_1",
    type: "SCHEDULE_CHANGE",
    previousDepartureAt: new Date("2026-10-01T08:30:00.000Z"),
    previousArrivalAt: new Date("2026-10-01T10:00:00.000Z"),
    newDepartureAt: new Date("2026-10-01T09:00:00.000Z"),
    newArrivalAt: new Date("2026-10-01T10:30:00.000Z"),
    reason: null,
    createdById: "USU_1",
    createdAt: new Date(),
    flight: { code: "VU-20261001-001" },
  };

  const cancellation: FlightChangeModel & { flight: { code: string } } = {
    ...scheduleChange,
    type: "CANCELLATION",
    newDepartureAt: null,
    newArrivalAt: null,
  };

  const notification: EmailNotificationModel = {
    id: "EML_1",
    type: "FLIGHT_SCHEDULE_CHANGE",
    recipientEmail: "passenger@example.com",
    subject: "Cambio de horario en tu vuelo VU-20261001-001",
    bookingId: "RES_1",
    flightChangeId: "CVU_1",
    status: "PENDING",
    attempts: 0,
    lastError: null,
    sentAt: null,
    createdAt: new Date(),
  };

  it("no envía nada y devuelve SKIPPED si la notificación no está PENDING", async () => {
    const outcome = await sendContingencyEmail(
      { ...notification, status: "SENT" },
      scheduleChange,
      "https://volar.example.com/contingencia",
    );

    expect(outcome).toBe("SKIPPED");
    expect(sendMail).not.toHaveBeenCalled();
    expect(prismaMock.emailNotification.update).not.toHaveBeenCalled();
  });

  it("devuelve SKIPPED sin enviar ni crear transporte si el tipo no es de contingencia", async () => {
    const createTransport = nodemailer.createTransport as ReturnType<typeof vi.fn>;
    createTransport.mockClear();

    const outcome = await sendContingencyEmail(
      { ...notification, type: "REBOOKING_CONFIRMATION" },
      scheduleChange,
      "https://volar.example.com/contingencia",
    );

    expect(outcome).toBe("SKIPPED");
    expect(createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
    expect(prismaMock.flight.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.emailNotification.update).not.toHaveBeenCalled();
  });

  it("envía un email de SCHEDULE_CHANGE con to, from, subject, texto, HTML y enlace con accessToken", async () => {
    prismaMock.ticketContingency.findMany.mockResolvedValue([
      { accessToken: "token-abc" },
      { accessToken: "token-def" },
    ] as never);

    await sendContingencyEmail(
      notification,
      scheduleChange,
      "https://volar.example.com/contingencia",
    );

    expect(sendMail).toHaveBeenCalledTimes(1);
    const message = sendMail.mock.calls[0][0];

    expect(message.from).toBe("no-reply@volar.example.com");
    expect(message.to).toBe("passenger@example.com");
    expect(message.subject).toBe(notification.subject);
    expect(message.text).toMatch(/VU-20261001-001/);
    expect(message.text).toMatch(/08:30/);
    expect(message.text).toMatch(/10:00/);
    expect(message.text).toMatch(/09:00/);
    expect(message.text).toMatch(/10:30/);
    expect(message.text).toMatch(/token=token-abc/);
    expect(message.text).toMatch(/token=token-def/);

    expect(message.html).toMatch(/VU-20261001-001/);
    expect(message.html).toMatch(/token=token-abc/);
    expect(message.html).toMatch(/token=token-def/);

    expect(message.attachments).toBeUndefined();
  });

  it("envía un email de CANCELLATION con el cuerpo adecuado", async () => {
    const cancelNotification: EmailNotificationModel = {
      ...notification,
      type: "FLIGHT_CANCELLATION",
      subject: "Cancelación de tu vuelo VU-20261001-001",
    };
    prismaMock.ticketContingency.findMany.mockResolvedValue([{ accessToken: "token-xyz" }] as never);

    await sendContingencyEmail(
      cancelNotification,
      cancellation,
      "https://volar.example.com/contingencia",
    );

    const message = sendMail.mock.calls[0][0];
    expect(message.text).toMatch(/fue cancelado/);
    expect(message.html).toMatch(/token=token-xyz/);
  });

  it("actualiza la notificación a SENT y devuelve SENT cuando el envío es exitoso", async () => {
    prismaMock.ticketContingency.findMany.mockResolvedValue([{ accessToken: "token-abc" }] as never);

    const outcome = await sendContingencyEmail(
      notification,
      scheduleChange,
      "https://volar.example.com/contingencia",
    );

    expect(outcome).toBe("SENT");
    expect(prismaMock.emailNotification.update).toHaveBeenCalledWith({
      where: { id: notification.id },
      data: {
        status: "SENT",
        attempts: { increment: 1 },
        sentAt: expect.any(Date),
        lastError: null,
      },
    });
  });

  it("actualiza la notificación a FAILED y devuelve FAILED cuando el envío falla", async () => {
    prismaMock.ticketContingency.findMany.mockResolvedValue([{ accessToken: "token-abc" }] as never);
    sendMail.mockRejectedValue(new Error("connection refused"));

    const outcome = await sendContingencyEmail(
      notification,
      scheduleChange,
      "https://volar.example.com/contingencia",
    );

    expect(outcome).toBe("FAILED");
    expect(prismaMock.emailNotification.update).toHaveBeenCalledWith({
      where: { id: notification.id },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
        lastError: "connection refused",
      },
    });
  });

  it("falla con mensaje claro si falta configuración SMTP", async () => {
    delete (process.env as Record<string, string | undefined>).SMTP_HOST;

    await expect(
      sendContingencyEmail(
        notification,
        scheduleChange,
        "https://volar.example.com/contingencia",
      ),
    ).rejects.toThrow(/Falta configuración SMTP/);

    expect(sendMail).not.toHaveBeenCalled();
  });
});
