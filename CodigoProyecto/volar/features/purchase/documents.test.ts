import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  buildETicketsFilename,
  buildETicketsPdf,
  buildInvoiceFilename,
  buildInvoicePdf,
} from "./documents";
import type { ComprobanteTicket, PurchaseComprobantes } from "./queries";

const ISSUED_AT = new Date("2026-10-07T12:00:00.000Z");
const FLIGHT_DATE = new Date("2026-10-29T00:00:00.000Z");
const DEPARTURE_AT = new Date("2026-10-29T08:30:00.000Z");
const ARRIVAL_AT = new Date("2026-10-29T11:30:00.000Z");

const ORIGINAL_FLIGHT = {
  code: "VU-ORIGINAL",
  date: FLIGHT_DATE,
  departureAt: DEPARTURE_AT,
  arrivalAt: ARRIVAL_AT,
  origin: { code: "AEP", city: "Buenos Aires" },
  destination: { code: "COR", city: "Cordoba" },
};

// US-26: tras una reprogramación el vuelo de la reserva sigue siendo el
// original, pero cada pasaje ya voló en el vuelo nuevo.
const REPROGRAMMED_FLIGHT = { ...ORIGINAL_FLIGHT, code: "VU-REPROGRAMADO" };

const CARD_SENTINEL = "TX-CARD-4111111111111111";

function ticket(overrides: Partial<ComprobanteTicket> = {}): ComprobanteTicket {
  return {
    id: "PAS_1",
    number: "ETK-DEMO0001-1",
    seat: "1A",
    seatClass: "ECONOMY",
    firstName: "Maria",
    lastName: "Demo",
    documentType: "DNI",
    documentNumber: "30000001",
    issuedAt: ISSUED_AT,
    flight: REPROGRAMMED_FLIGHT,
    ...overrides,
  };
}

/** Fixture tipado: dos pasajes reprogramados y una factura. */
function purchaseFixture(
  overrides: Partial<PurchaseComprobantes> = {},
): PurchaseComprobantes {
  return {
    code: "DEMO0001",
    status: "CONFIRMED",
    seatClass: "ECONOMY",
    quantity: 2,
    totalAmount: "90000",
    confirmedAt: ISSUED_AT,
    contactEmail: "demo@volar.test",
    flight: ORIGINAL_FLIGHT,
    tickets: [
      ticket(),
      ticket({
        id: "PAS_2",
        number: "ETK-DEMO0001-2",
        seat: "1B",
        firstName: "Juan",
        documentNumber: "30000002",
      }),
    ],
    invoice: {
      id: "FAC_1",
      number: 1,
      customerName: "Pasajero Demo",
      customerEmail: "demo@volar.test",
      totalAmount: "90000",
      issuedAt: ISSUED_AT,
      items: [
        {
          description: "Pasaje Economy VU-REPROGRAMADO - Demo, Maria",
          quantity: 1,
          unitPrice: "45000",
          amount: "45000",
        },
        {
          description: "Pasaje Economy VU-REPROGRAMADO - Demo, Juan",
          quantity: 1,
          unitPrice: "45000",
          amount: "45000",
        },
      ],
    },
    email: { recipientEmail: "demo@volar.test", status: "SENT", sentAt: ISSUED_AT },
    transactionId: CARD_SENTINEL,
    ...overrides,
  };
}

function bytesAsLatin1(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("latin1");
}

/**
 * Texto visible del PDF: pdf-lib comprime los content streams (Flate) y
 * escribe cada línea como cadena hexadecimal, así que se inflan los streams
 * y se decodifican las cadenas de `Tj`. Sólo se usan marcadores ASCII.
 */
function pdfText(bytes: Uint8Array): string {
  const raw = bytesAsLatin1(bytes);
  const streams: string[] = [];
  let cursor = 0;

  for (;;) {
    const start = raw.indexOf("stream\n", cursor);
    if (start === -1) break;
    const end = raw.indexOf("\nendstream", start);
    if (end === -1) break;

    const chunk = Buffer.from(bytes.subarray(start + "stream\n".length, end));
    try {
      streams.push(inflateSync(chunk).toString("latin1"));
    } catch {
      streams.push(chunk.toString("latin1"));
    }
    cursor = end + "\nendstream".length;
  }

  const content = streams.join("\n");
  const parts: string[] = [];

  for (const match of content.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) {
    parts.push(Buffer.from(match[1], "hex").toString("latin1"));
  }
  for (const match of content.matchAll(/\(((?:\\.|[^)\\])*)\)\s*Tj/g)) {
    parts.push(match[1].replace(/\\([()\\])/g, "$1"));
  }

  return parts.join("\n");
}

function expectPdfHeader(bytes: Uint8Array) {
  expect(bytes).toBeInstanceOf(Uint8Array);
  expect(bytesAsLatin1(bytes.slice(0, 5))).toBe("%PDF-");
}

describe("buildETicketsPdf (US-36)", () => {
  it("genera un PDF con cabecera %PDF-", async () => {
    const bytes = await buildETicketsPdf(purchaseFixture());

    expectPdfHeader(bytes);
  });

  it("muestra los datos de cada pasaje y el total de la compra", async () => {
    const text = pdfText(await buildETicketsPdf(purchaseFixture()));

    expect(text).toContain("DEMO0001");
    expect(text).toContain("ETK-DEMO0001-1");
    expect(text).toContain("ETK-DEMO0001-2");
    expect(text).toContain("Demo, Maria");
    expect(text).toContain("Demo, Juan");
    expect(text).toContain("AEP");
    expect(text).toContain("COR");
    expect(text).toContain("1A");
    expect(text).toContain("1B");
    expect(text).toContain("Economy");
    expect(text).toContain("Total de la compra: ");
    expect(text).toContain("90.000");
  });

  it("usa el vuelo de cada pasaje y no el vuelo original de la reserva", async () => {
    const text = pdfText(await buildETicketsPdf(purchaseFixture()));

    expect(text).toContain("VU-REPROGRAMADO");
    expect(text).not.toContain("VU-ORIGINAL");
  });

  it("crea una página A4 por pasaje", async () => {
    const purchase = purchaseFixture();

    const pdf = await PDFDocument.load(await buildETicketsPdf(purchase));

    expect(pdf.getPageCount()).toBe(purchase.tickets.length);
    const { width, height } = pdf.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
  });

  it("no imprime datos de pago, tarjeta ni correo de contacto", async () => {
    const bytes = await buildETicketsPdf(purchaseFixture());

    expect(bytesAsLatin1(bytes)).not.toContain(CARD_SENTINEL);
    expect(pdfText(bytes)).not.toContain(CARD_SENTINEL);
    expect(pdfText(bytes)).not.toContain("demo@volar.test");
  });

  it("falla con TICKETS_NOT_FOUND si la compra no tiene pasajes", async () => {
    await expect(buildETicketsPdf(purchaseFixture({ tickets: [] }))).rejects.toThrow(
      "TICKETS_NOT_FOUND",
    );
  });
});

describe("buildInvoicePdf (US-36)", () => {
  it("genera la factura con su número, cliente, ítems y total", async () => {
    const bytes = await buildInvoicePdf(purchaseFixture());
    const text = pdfText(bytes);

    expectPdfHeader(bytes);
    expect(text).toContain("0001-00000001");
    expect(text).toContain("DEMO0001");
    expect(text).toContain("Pasajero Demo");
    // La descripción larga se envuelve por palabras: se valida el texto completo
    // de cada ítem sin depender del corte de línea.
    expect(text.replace(/\n/g, " ")).toContain(
      "Pasaje Economy VU-REPROGRAMADO - Demo, Maria",
    );
    expect(text.replace(/\n/g, " ")).toContain(
      "Pasaje Economy VU-REPROGRAMADO - Demo, Juan",
    );
    expect(text).toContain("TOTAL ABONADO: ");
    expect(text).toContain("90.000");
  });

  it("no imprime datos de pago ni de tarjeta", async () => {
    const bytes = await buildInvoicePdf(purchaseFixture());

    expect(bytesAsLatin1(bytes)).not.toContain(CARD_SENTINEL);
    expect(pdfText(bytes)).not.toContain(CARD_SENTINEL);
  });

  it("falla con INVOICE_NOT_FOUND si la compra no tiene factura", async () => {
    await expect(buildInvoicePdf(purchaseFixture({ invoice: null }))).rejects.toThrow(
      "INVOICE_NOT_FOUND",
    );
  });
});

describe("nombres de archivo (US-36)", () => {
  it("sanea intentos de recorrido de rutas en e-tickets y factura", () => {
    const tickets = buildETicketsFilename("../../RES 2026/001");
    const invoice = buildInvoiceFilename("../../RES 2026/001");

    expect(tickets).toBe("VolAR-e-tickets-RES-2026-001.pdf");
    expect(invoice).toBe("VolAR-factura-RES-2026-001.pdf");
    for (const name of [tickets, invoice]) {
      expect(name.endsWith(".pdf")).toBe(true);
      expect(name).not.toContain("/");
      expect(name).not.toContain("\\");
      expect(name).not.toContain("..");
    }
  });

  it("recorta a 40 caracteres y usa 'reserva' como respaldo", () => {
    const long = buildETicketsFilename("A".repeat(60));

    expect(long).toBe(`VolAR-e-tickets-${"A".repeat(40)}.pdf`);
    expect(buildInvoiceFilename("...")).toBe("VolAR-factura-reserva.pdf");
  });
});
