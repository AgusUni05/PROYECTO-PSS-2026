import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import nodemailer from "nodemailer";
import { prismaMock } from "@/tests/prisma-mock";
import type { EmailNotificationModel } from "@/generated/prisma/models/EmailNotification";
import type { PurchaseComprobantes } from "@/features/purchase/queries";
import { sendPurchaseConfirmationEmail } from "./purchase";

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(),
  },
}));

vi.mock("@/features/purchase/queries", () => ({
  getBookingComprobantes: vi.fn(),
}));

vi.mock("@/features/purchase/documents", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/features/purchase/documents")>();
  return {
    ...original,
    buildETicketsPdf: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70])),
    buildInvoicePdf: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70])),
  };
});

import { getBookingComprobantes } from "@/features/purchase/queries";

const sendMail = vi.fn();
const originalEnv = process.env;

const notification: EmailNotificationModel = {
  id: "EML_BUY_1",
  type: "PURCHASE_CONFIRMATION",
  recipientEmail: "buyer@example.com",
  subject: "Tus pasajes y factura - reserva DEMO0001",
  bookingId: "RES_1",
  flightChangeId: null,
  status: "PENDING",
  attempts: 0,
  lastError: null,
  sentAt: null,
  createdAt: new Date("2026-10-24T12:00:00.000Z"),
};

const flight = {
  code: "VU-20261024-001",
  date: new Date("2026-10-24T00:00:00.000Z"),
  departureAt: new Date("2026-10-24T08:30:00.000Z"),
  arrivalAt: new Date("2026-10-24T10:00:00.000Z"),
  origin: { code: "AEP", city: "Buenos Aires" },
  destination: { code: "COR", city: "Córdoba" },
};

const purchase: PurchaseComprobantes = {
  code: "DEMO0001",
  status: "CONFIRMED",
  seatClass: "ECONOMY",
  quantity: 1,
  totalAmount: "45000",
  confirmedAt: new Date("2026-10-24T12:00:00.000Z"),
  contactEmail: "buyer@example.com",
  flight,
  tickets: [
    {
      id: "PAS_1",
      number: "ETK-DEMO0001-1",
      seat: "1A",
      seatClass: "ECONOMY",
      firstName: "Ana",
      lastName: "Demo",
      documentType: "DNI",
      documentNumber: "30123456",
      status: "ISSUED",
      issuedAt: new Date("2026-10-24T12:00:00.000Z"),
      flight,
    },
  ],
  invoice: {
    id: "INV_1",
    number: 1,
    customerName: "Ana Demo",
    customerEmail: "buyer@example.com",
    totalAmount: "45000",
    issuedAt: new Date("2026-10-24T12:00:00.000Z"),
    items: [
      {
        description: "Pasaje Economy",
        quantity: 1,
        unitPrice: "45000",
        amount: "45000",
      },
    ],
  },
  email: null,
  transactionId: "TX-1",
};

describe("sendPurchaseConfirmationEmail", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_SECURE = "false";
    process.env.SMTP_USER = "user@example.com";
    process.env.SMTP_PASSWORD = "secret";
    process.env.MAIL_FROM = "no-reply@volar.example.com";

    sendMail.mockReset();
    sendMail.mockResolvedValue({ messageId: "<purchase>" });
    (nodemailer.createTransport as ReturnType<typeof vi.fn>).mockReturnValue({ sendMail });

    vi.mocked(getBookingComprobantes).mockReset();
    vi.mocked(getBookingComprobantes).mockResolvedValue(purchase);
    prismaMock.emailNotification.update.mockResolvedValue({} as never);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("omite sin enviar si la notificación no está pendiente, no es de compra o no tiene reserva", async () => {
    expect(await sendPurchaseConfirmationEmail({ ...notification, status: "SENT" }, "DEMO0001")).toBe(
      "SKIPPED",
    );
    expect(await sendPurchaseConfirmationEmail({ ...notification, type: "FLIGHT_CANCELLATION" }, "DEMO0001")).toBe(
      "SKIPPED",
    );
    expect(await sendPurchaseConfirmationEmail({ ...notification, bookingId: null }, "DEMO0001")).toBe(
      "SKIPPED",
    );

    expect(sendMail).not.toHaveBeenCalled();
    expect(prismaMock.emailNotification.update).not.toHaveBeenCalled();
  });

  it("reintenta una fila FAILED si todavía tiene intentos disponibles", async () => {
    const outcome = await sendPurchaseConfirmationEmail(
      { ...notification, status: "FAILED", attempts: 1, lastError: "timeout" },
      "DEMO0001",
    );

    expect(outcome).toBe("SENT");
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("envía la confirmación al comprador con e-tickets y factura adjuntos", async () => {
    const outcome = await sendPurchaseConfirmationEmail(notification, "DEMO0001");

    expect(outcome).toBe("SENT");
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "no-reply@volar.example.com",
        to: "buyer@example.com",
        subject: "Tus pasajes y factura - reserva DEMO0001",
        text: expect.stringContaining("DEMO0001"),
        html: expect.stringContaining("DEMO0001"),
        attachments: [
          expect.objectContaining({
            filename: "VolAR-e-tickets-DEMO0001.pdf",
            contentType: "application/pdf",
          }),
          expect.objectContaining({
            filename: "VolAR-factura-DEMO0001.pdf",
            contentType: "application/pdf",
          }),
        ],
      }),
    );
    expect(prismaMock.emailNotification.update).toHaveBeenCalledWith({
      where: { id: "EML_BUY_1" },
      data: expect.objectContaining({
        status: "SENT",
        attempts: { increment: 1 },
        lastError: null,
      }),
    });
  });

  it("envía sólo e-tickets si la compra no tiene factura", async () => {
    vi.mocked(getBookingComprobantes).mockResolvedValue({ ...purchase, invoice: null });

    expect(await sendPurchaseConfirmationEmail(notification, "DEMO0001")).toBe("SENT");

    const attachments = sendMail.mock.calls[0][0].attachments as Array<{ filename: string }>;
    expect(attachments).toHaveLength(1);
    expect(attachments[0].filename).toBe("VolAR-e-tickets-DEMO0001.pdf");
  });

  it("marca FAILED y guarda el error si Nodemailer rechaza el envío", async () => {
    sendMail.mockRejectedValue(new Error("550 relay denied"));

    const outcome = await sendPurchaseConfirmationEmail(notification, "DEMO0001");

    expect(outcome).toBe("FAILED");
    expect(prismaMock.emailNotification.update).toHaveBeenCalledWith({
      where: { id: "EML_BUY_1" },
      data: expect.objectContaining({
        status: "FAILED",
        attempts: { increment: 1 },
        lastError: "550 relay denied",
      }),
    });
  });

  it("marca FAILED si la reserva ya no existe", async () => {
    vi.mocked(getBookingComprobantes).mockResolvedValue(null);

    expect(await sendPurchaseConfirmationEmail(notification, "DEMO0001")).toBe("FAILED");
    expect(prismaMock.emailNotification.update).toHaveBeenCalledWith({
      where: { id: "EML_BUY_1" },
      data: expect.objectContaining({
        status: "FAILED",
        lastError: "No se encontró la reserva DEMO0001.",
      }),
    });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("deja la fila PENDING si falta configuración SMTP", async () => {
    delete process.env.SMTP_HOST;

    await expect(sendPurchaseConfirmationEmail(notification, "DEMO0001")).rejects.toThrow(
      /SMTP_HOST/,
    );
    expect(prismaMock.emailNotification.update).not.toHaveBeenCalled();
  });
});
