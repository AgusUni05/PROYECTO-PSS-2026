import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/generated/prisma/client";
import type { PurchaseComprobantes } from "@/features/purchase/queries";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/purchase/queries", () => ({
  getBookingComprobantesForBuyer: vi.fn(),
}));

vi.mock("@/features/purchase/documents", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/purchase/documents")>();
  return {
    ...actual,
    buildETicketsPdf: vi.fn(),
    buildInvoicePdf: vi.fn(),
  };
});

import { getCurrentUser } from "@/lib/auth";
import { getBookingComprobantesForBuyer } from "@/features/purchase/queries";
import { buildETicketsPdf, buildInvoicePdf } from "@/features/purchase/documents";
import { GET as getETickets } from "./etickets/route";
import { GET as getInvoice } from "./factura/route";

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "USR_SESSION",
    clerkId: "clerk_session",
    email: "sesion@volar.test",
    firstName: "Sesión",
    lastName: "Demo",
    documentType: null,
    documentNumber: null,
    phone: null,
    role: "PASSENGER",
    isActive: true,
    createdById: null,
    createdAt: new Date("2026-10-01T12:00:00.000Z"),
    updatedAt: new Date("2026-10-01T12:00:00.000Z"),
    ...overrides,
  };
}

function makePurchase(overrides: Partial<PurchaseComprobantes> = {}): PurchaseComprobantes {
  const issuedAt = new Date("2026-10-07T12:00:00.000Z");
  const ticketFlight = {
    code: "VU-DEMO-02",
    date: new Date("2026-10-30T00:00:00.000Z"),
    departureAt: new Date("2026-10-30T09:00:00.000Z"),
    arrivalAt: new Date("2026-10-30T12:00:00.000Z"),
    origin: { code: "DEM3", city: "Ciudad Nueva" },
    destination: { code: "DEM4", city: "Destino Nuevo" },
  };

  return {
    code: "DEMO0001",
    status: "CONFIRMED",
    seatClass: "ECONOMY",
    quantity: 2,
    totalAmount: "90000",
    confirmedAt: issuedAt,
    contactEmail: "demo@volar.test",
    flight: {
      code: "VU-DEMO-01",
      date: new Date("2026-10-29T00:00:00.000Z"),
      departureAt: new Date("2026-10-29T08:30:00.000Z"),
      arrivalAt: new Date("2026-10-29T11:30:00.000Z"),
      origin: { code: "DEM1", city: "Ciudad Demo" },
      destination: { code: "DEM2", city: "Destino Demo" },
    },
    tickets: [
      {
        id: "PAS_1",
        number: "ETK-DEMO0001-1",
        seat: "1A",
        seatClass: "ECONOMY",
        firstName: "María",
        lastName: "Demo",
        documentType: "DNI",
        documentNumber: "30000001",
        status: "ISSUED",
        issuedAt,
        flight: ticketFlight,
      },
      {
        id: "PAS_2",
        number: "ETK-DEMO0001-2",
        seat: "1B",
        seatClass: "ECONOMY",
        firstName: "Juan",
        lastName: "Demo",
        documentType: "DNI",
        documentNumber: "30000002",
        status: "ISSUED",
        issuedAt,
        flight: ticketFlight,
      },
    ],
    invoice: {
      id: "FAC_1",
      number: 1,
      customerName: "Pasajero Demo",
      customerEmail: "demo@volar.test",
      totalAmount: "90000",
      issuedAt,
      items: [
        { description: "Pasaje Economy VU-DEMO-01", quantity: 1, unitPrice: "45000", amount: "45000" },
      ],
    },
    email: { recipientEmail: "demo@volar.test", status: "SENT", sentAt: issuedAt },
    transactionId: "TX-ABCDEF123456",
    ...overrides,
  };
}

function callETickets(code = "DEMO0001", search = "") {
  return getETickets(
    new Request(`http://localhost/api/compras/${code}/etickets${search}`),
    { params: Promise.resolve({ code }) },
  );
}

function callInvoice(code = "DEMO0001", search = "") {
  return getInvoice(
    new Request(`http://localhost/api/compras/${code}/factura${search}`),
    { params: Promise.resolve({ code }) },
  );
}

/** Todo error de la ruta debe ser JSON con el contrato `{ error }`. */
async function expectJsonError(response: Response, status: number, error: string) {
  expect(response.status).toBe(status);
  expect(response.headers.get("Content-Type")).toContain("application/json");
  expect(await response.json()).toEqual({ error });
}

describe("GET /api/compras/[code]/etickets (US-36)", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getCurrentUser).mockResolvedValue(makeUser());
    vi.mocked(getBookingComprobantesForBuyer).mockResolvedValue(makePurchase());
    vi.mocked(buildETicketsPdf).mockResolvedValue(PDF_BYTES);
    vi.mocked(buildInvoicePdf).mockResolvedValue(PDF_BYTES);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("sin sesión responde 401 y no consulta ni genera documentos", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const response = await callETickets();

    await expectJsonError(response, 401, "No autorizado");
    expect(getBookingComprobantesForBuyer).not.toHaveBeenCalled();
    expect(buildETicketsPdf).not.toHaveBeenCalled();
    expect(buildInvoicePdf).not.toHaveBeenCalled();
  });

  it("con la cuenta desactivada responde 403 y no consulta la reserva", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeUser({ isActive: false }));

    const response = await callETickets();

    await expectJsonError(response, 403, "Cuenta desactivada");
    expect(getBookingComprobantesForBuyer).not.toHaveBeenCalled();
    expect(buildETicketsPdf).not.toHaveBeenCalled();
  });

  it("con un código malformado responde 404 sin consultar la base", async () => {
    const response = await callETickets("no!");

    await expectJsonError(response, 404, "Compra no encontrada");
    expect(getBookingComprobantesForBuyer).not.toHaveBeenCalled();
    expect(buildETicketsPdf).not.toHaveBeenCalled();
  });

  it("una reserva ajena y una inexistente son indistinguibles", async () => {
    vi.mocked(getBookingComprobantesForBuyer).mockResolvedValue(null);

    const foreign = await callETickets("DEMO0001");
    const missing = await callETickets("OTRO0001");

    const foreignBody = await foreign.text();
    const missingBody = await missing.text();

    expect(foreign.status).toBe(404);
    expect(missing.status).toBe(foreign.status);
    expect(foreign.headers.get("Content-Type")).toContain("application/json");
    expect(missingBody).toBe(foreignBody);
    expect(JSON.parse(foreignBody)).toEqual({ error: "Compra no encontrada" });
    expect(buildETicketsPdf).not.toHaveBeenCalled();
  });

  it("normaliza el código de la URL a mayúsculas antes de consultar", async () => {
    const response = await callETickets("demo0001");

    expect(response.status).toBe(200);
    expect(getBookingComprobantesForBuyer).toHaveBeenCalledWith("DEMO0001", "USR_SESSION");
  });

  it("el dueño confirmado descarga sus e-tickets como PDF", async () => {
    const response = await callETickets();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="VolAR-e-tickets-DEMO0001.pdf"',
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PDF_BYTES);
    expect(buildETicketsPdf).toHaveBeenCalledWith(makePurchase());
    expect(buildInvoicePdf).not.toHaveBeenCalled();
  });

  it("toma la titularidad solo de la sesión e ignora userId, buyerId y pdfPath", async () => {
    await callETickets(
      "DEMO0001",
      "?userId=USR_OTHER&buyerId=USR_OTHER&pdfPath=../../etc/passwd&email=otro@volar.test",
    );

    expect(getBookingComprobantesForBuyer).toHaveBeenCalledTimes(1);
    expect(getBookingComprobantesForBuyer).toHaveBeenCalledWith("DEMO0001", "USR_SESSION");
  });

  it("una compra no confirmada responde 409 sin generar documentos", async () => {
    vi.mocked(getBookingComprobantesForBuyer).mockResolvedValue(
      makePurchase({ status: "PENDING_PAYMENT" }),
    );

    const response = await callETickets();

    await expectJsonError(response, 409, "La compra no está confirmada");
    expect(buildETicketsPdf).not.toHaveBeenCalled();
    expect(buildInvoicePdf).not.toHaveBeenCalled();
  });

  it("responde 404 cuando los e-tickets no están emitidos", async () => {
    vi.mocked(buildETicketsPdf).mockRejectedValue(new Error("TICKETS_NOT_FOUND"));

    const response = await callETickets();

    await expectJsonError(response, 404, "Comprobante no disponible");
  });

  it("no filtra detalles internos ante un fallo inesperado del builder", async () => {
    vi.mocked(buildETicketsPdf).mockRejectedValue(new Error("SQL secret detail"));

    const response = await callETickets();

    expect(response.status).toBe(500);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({ error: "No se pudo generar el comprobante" });
    expect(body).not.toContain("SQL secret detail");
    expect(consoleError).toHaveBeenCalled();
  });

  it("un fallo inesperado al consultar la reserva responde 500 JSON genérico", async () => {
    vi.mocked(getBookingComprobantesForBuyer).mockRejectedValue(
      new Error("connect ECONNREFUSED"),
    );

    const response = await callETickets();

    expect(response.status).toBe(500);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({ error: "No se pudo generar el comprobante" });
    expect(body).not.toContain("connect ECONNREFUSED");
    expect(buildETicketsPdf).not.toHaveBeenCalled();
  });
});

describe("GET /api/compras/[code]/factura (US-36)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(makeUser());
    vi.mocked(getBookingComprobantesForBuyer).mockResolvedValue(makePurchase());
    vi.mocked(buildETicketsPdf).mockResolvedValue(PDF_BYTES);
    vi.mocked(buildInvoicePdf).mockResolvedValue(PDF_BYTES);
  });

  it("el dueño confirmado descarga su factura como PDF", async () => {
    const response = await callInvoice();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="VolAR-factura-DEMO0001.pdf"',
    );
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PDF_BYTES);
    expect(buildInvoicePdf).toHaveBeenCalledWith(makePurchase());
    expect(buildETicketsPdf).not.toHaveBeenCalled();
  });

  it("responde 404 cuando la factura no está emitida", async () => {
    vi.mocked(buildInvoicePdf).mockRejectedValue(new Error("INVOICE_NOT_FOUND"));

    const response = await callInvoice();

    await expectJsonError(response, 404, "Comprobante no disponible");
  });
});
