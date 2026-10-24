import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { sendContingencyEmail } from "./send";
import { dispatchPendingContingencyEmails } from "./dispatch";

vi.mock("./send", () => ({
  sendContingencyEmail: vi.fn(),
}));

const sendMock = vi.mocked(sendContingencyEmail);

const flightChange = {
  id: "CVU_1",
  flightId: "VUE_1",
  type: "CANCELLATION",
  previousDepartureAt: new Date("2026-10-01T08:30:00.000Z"),
  previousArrivalAt: new Date("2026-10-01T10:00:00.000Z"),
  newDepartureAt: null,
  newArrivalAt: null,
  reason: null,
  createdById: "USU_1",
  createdAt: new Date("2026-10-01T08:00:00.000Z"),
  flight: { id: "VUE_1", code: "VU-20261001-001" },
};

function pendingNotification(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    type: "FLIGHT_CANCELLATION",
    recipientEmail: "passenger@example.com",
    subject: "Cancelación de tu vuelo VU-20261001-001",
    bookingId: "RES_1",
    flightChangeId: "CVU_1",
    status: "PENDING",
    attempts: 0,
    lastError: null,
    sentAt: null,
    createdAt: new Date("2026-10-01T08:00:00.000Z"),
    flightChange,
    ...overrides,
  };
}

const BASE_URL = "https://volar.example.com";

describe("dispatchPendingContingencyEmails", () => {
  beforeEach(() => {
    sendMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("devuelve conteos en cero y no llama al emisor si no hay filas PENDING", async () => {
    prismaMock.emailNotification.findMany.mockResolvedValue([]);

    const summary = await dispatchPendingContingencyEmails(BASE_URL);

    expect(summary).toEqual({ processed: 0, sent: 0, failed: 0, skipped: 0 });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("consulta solo las PENDING de contingencia, con vuelo incluido y en orden de creación ascendente", async () => {
    prismaMock.emailNotification.findMany.mockResolvedValue([]);

    await dispatchPendingContingencyEmails(BASE_URL);

    expect(prismaMock.emailNotification.findMany).toHaveBeenCalledWith({
      where: {
        status: "PENDING",
        type: { in: ["FLIGHT_CANCELLATION", "FLIGHT_SCHEDULE_CHANGE"] },
      },
      include: { flightChange: { include: { flight: true } } },
      orderBy: { createdAt: "asc" },
    });
  });

  it("cuenta como enviada una notificación cuyo emisor devuelve SENT", async () => {
    const notification = pendingNotification("EML_1");
    prismaMock.emailNotification.findMany.mockResolvedValue([notification] as never);
    sendMock.mockResolvedValue("SENT");

    const summary = await dispatchPendingContingencyEmails(BASE_URL);

    expect(summary).toEqual({ processed: 1, sent: 1, failed: 0, skipped: 0 });
    expect(sendMock).toHaveBeenCalledWith(
      notification,
      flightChange,
      "https://volar.example.com/contingencia",
    );
  });

  it("incrementa failed y skipped según el resultado del emisor", async () => {
    const failed = pendingNotification("EML_FAILED");
    const skipped = pendingNotification("EML_SKIPPED", { status: "SENT" });
    prismaMock.emailNotification.findMany.mockResolvedValue([failed, skipped] as never);
    sendMock.mockResolvedValueOnce("FAILED").mockResolvedValueOnce("SKIPPED");

    const summary = await dispatchPendingContingencyEmails(BASE_URL);

    expect(summary).toEqual({ processed: 2, sent: 0, failed: 1, skipped: 1 });
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("cuenta un error del emisor como fallido y sigue con las filas siguientes", async () => {
    const first = pendingNotification("EML_1");
    const second = pendingNotification("EML_2");
    prismaMock.emailNotification.findMany.mockResolvedValue([first, second] as never);
    sendMock.mockRejectedValueOnce(new Error("Falta configuración SMTP: SMTP_HOST"));
    sendMock.mockResolvedValueOnce("SENT");

    const summary = await dispatchPendingContingencyEmails(BASE_URL);

    expect(summary).toEqual({ processed: 2, sent: 1, failed: 1, skipped: 0 });
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("cuenta como fallida una notificación sin cambio de vuelo y no la envía", async () => {
    const orphan = pendingNotification("EML_ORPHAN", { flightChangeId: null, flightChange: null });
    prismaMock.emailNotification.findMany.mockResolvedValue([orphan] as never);

    const summary = await dispatchPendingContingencyEmails(BASE_URL);

    expect(summary).toEqual({ processed: 1, sent: 0, failed: 1, skipped: 0 });
    expect(sendMock).not.toHaveBeenCalled();
    expect(prismaMock.emailNotification.update).not.toHaveBeenCalled();
  });
});
