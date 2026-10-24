import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFFont, PDFPage } from "pdf-lib";
import { SEAT_CLASS_LABELS } from "@/features/flight-search/class-options";
import {
  formatCurrency,
  formatDate,
  formatLongDate,
  formatTime,
} from "@/features/flights/format";
import type { ComprobanteTicket, PurchaseComprobantes } from "./queries";

// US-36: armado de los PDF de e-tickets y factura. Son funciones puras: no
// tocan Prisma, ni el sistema de archivos, ni Next.js. Task 12 se encarga de
// las rutas de descarga.

const PAGE_WIDTH = 595.28; // A4 en puntos
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LABEL_COLUMN_WIDTH = 140;
const ROW_HEIGHT = 16;
const LINE_GAP = 3;

const FILENAME_MAX_LENGTH = 40;
const FALLBACK_BOOKING_SLUG = "reserva";

const TEXT_COLOR = rgb(0.11, 0.11, 0.11);
const MUTED_COLOR = rgb(0.38, 0.38, 0.38);
const RULE_COLOR = rgb(0.72, 0.72, 0.72);

type DocumentFonts = { regular: PDFFont; bold: PDFFont };

type DrawTextOptions = {
  x: number;
  y: number;
  size: number;
  font: PDFFont;
  color?: ReturnType<typeof rgb>;
};

// pdf-lib con fuentes estándar usa WinAnsi: los caracteres tipográficos no
// ASCII no se pueden dibujar, así que se normalizan antes de dibujar.
const PDF_TEXT_REPLACEMENTS: [RegExp, string][] = [
  [/[\u2018\u2019\u201A\u201B\u2032]/g, "'"],
  [/[\u201C\u201D\u201E\u201F\u2033]/g, '"'],
  [/[\u2013\u2014\u2015]/g, "-"],
  [/\u2192/g, "->"],
  [/\u2022/g, "-"],
  [/\u2026/g, "..."],
];

/** Texto seguro para WinAnsi: comillas, guiones, flechas y viñetas en ASCII. */
function pdfText(value: string): string {
  let text = value.replace(/[\r\n\t]+/g, " ");

  for (const [pattern, replacement] of PDF_TEXT_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  return text
    .replace(/\u00a0/g, " ")
    .replace(/[^\x20-\x7e\xa1-\xff]/g, "?");
}

/** Nombre de archivo seguro: sólo `[A-Za-z0-9_-]`, sin rutas ni `..`. */
function sanitizeBookingCode(bookingCode: string): string {
  const slug = bookingCode
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .slice(0, FILENAME_MAX_LENGTH)
    .replace(/^[-_]+|[-_]+$/g, "");

  return slug.length > 0 ? slug : FALLBACK_BOOKING_SLUG;
}

export function buildETicketsFilename(bookingCode: string): string {
  return `VolAR-e-tickets-${sanitizeBookingCode(bookingCode)}.pdf`;
}

export function buildInvoiceFilename(bookingCode: string): string {
  return `VolAR-factura-${sanitizeBookingCode(bookingCode)}.pdf`;
}

function drawText(page: PDFPage, text: string, options: DrawTextOptions): void {
  page.drawText(pdfText(text), options);
}

function drawRightAligned(
  page: PDFPage,
  text: string,
  options: Omit<DrawTextOptions, "x"> & { right: number },
): void {
  const safe = pdfText(text);
  page.drawText(safe, {
    ...options,
    x: options.right - options.font.widthOfTextAtSize(safe, options.size),
  });
}

/** Corta un texto por palabras según el ancho real de la fuente. */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const safe = pdfText(text);
  const words = safe.split(/\s+/).filter((word) => word.length > 0);
  const lines: string[] = [];
  let current = "";

  const pushWord = (word: string) => {
    const candidate = current.length > 0 ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      return;
    }
    if (current.length > 0) {
      lines.push(current);
      current = "";
    }
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      current = word;
      return;
    }
    // Palabra más ancha que la columna: se parte carácter por carácter.
    let chunk = "";
    for (const char of word) {
      if (font.widthOfTextAtSize(chunk + char, size) > maxWidth && chunk.length > 0) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk += char;
      }
    }
    current = chunk;
  };

  for (const word of words) pushWord(word);
  if (current.length > 0) lines.push(current);

  return lines.length > 0 ? lines : [""];
}

function formatDocument(documentType: ComprobanteTicket["documentType"]): string {
  return documentType === "DNI" ? "DNI" : "Pasaporte";
}

function formatInvoiceNumber(number: number): string {
  return `0001-${String(number).padStart(8, "0")}`;
}

function bookingTotal(purchase: PurchaseComprobantes): string {
  return `Total de la compra: ${formatCurrency(purchase.totalAmount)}`;
}

async function newDocument(title: string, subject: string): Promise<PDFDocument> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(title);
  pdfDoc.setAuthor("VolAR");
  pdfDoc.setSubject(subject);
  pdfDoc.setCreator("VolAR");
  pdfDoc.setProducer("VolAR");
  return pdfDoc;
}

async function embedFonts(pdfDoc: PDFDocument): Promise<DocumentFonts> {
  return {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
  };
}

/** Encabezado común: marca, título del documento y línea separadora. */
function drawHeader(page: PDFPage, fonts: DocumentFonts, title: string): number {
  const { width, height } = page.getSize();
  const top = height - MARGIN;

  drawText(page, "VolAR", {
    x: MARGIN,
    y: top - 16,
    size: 22,
    font: fonts.bold,
    color: TEXT_COLOR,
  });
  drawRightAligned(page, title, {
    right: width - MARGIN,
    y: top - 12,
    size: 12,
    font: fonts.bold,
    color: TEXT_COLOR,
  });
  page.drawLine({
    start: { x: MARGIN, y: top - 28 },
    end: { x: width - MARGIN, y: top - 28 },
    thickness: 1.4,
    color: RULE_COLOR,
  });

  return top - 52;
}

/** Etiqueta a la izquierda y valor (posiblemente en varias líneas) a la derecha. */
function drawField(
  page: PDFPage,
  fonts: DocumentFonts,
  y: number,
  label: string,
  value: string,
  size = 11,
): number {
  const valueWidth = CONTENT_WIDTH - LABEL_COLUMN_WIDTH;
  const lines = wrapText(value, fonts.bold, size, valueWidth);

  drawText(page, label, {
    x: MARGIN,
    y,
    size: 9,
    font: fonts.regular,
    color: MUTED_COLOR,
  });
  lines.forEach((line, index) => {
    drawText(page, line, {
      x: MARGIN + LABEL_COLUMN_WIDTH,
      y: y - index * (size + LINE_GAP),
      size,
      font: fonts.bold,
      color: TEXT_COLOR,
    });
  });

  return y - (lines.length - 1) * (size + LINE_GAP) - ROW_HEIGHT;
}

/** Pie de página con el total de la compra, dentro del margen inferior. */
function drawTotalFooter(page: PDFPage, fonts: DocumentFonts, total: string): void {
  const { width } = page.getSize();
  const y = MARGIN + 34;
  const safeTotal = pdfText(total);
  const size = 12;

  page.drawLine({
    start: { x: MARGIN, y: y + 18 },
    end: { x: width - MARGIN, y: y + 18 },
    thickness: 0.8,
    color: RULE_COLOR,
  });

  const splitAt = safeTotal.lastIndexOf(": ");
  if (splitAt === -1) {
    drawText(page, safeTotal, { x: MARGIN, y, size, font: fonts.bold, color: TEXT_COLOR });
    return;
  }

  const label = safeTotal.slice(0, splitAt + 2);
  const amount = safeTotal.slice(splitAt + 2);
  drawText(page, label, {
    x: MARGIN,
    y,
    size: 10,
    font: fonts.regular,
    color: MUTED_COLOR,
  });
  drawRightAligned(page, amount, {
    right: width - MARGIN,
    y,
    size,
    font: fonts.bold,
    color: TEXT_COLOR,
  });
}

/** Un e-ticket por página (US-36); siempre usa el vuelo actual del pasaje. */
function drawETicketPage(
  page: PDFPage,
  fonts: DocumentFonts,
  purchase: PurchaseComprobantes,
  ticket: ComprobanteTicket,
  index: number,
  total: number,
): void {
  const { flight } = ticket;
  let y = drawHeader(page, fonts, "PASAJE ELECTRONICO");

  drawText(page, "RESERVA", {
    x: MARGIN,
    y,
    size: 9,
    font: fonts.regular,
    color: MUTED_COLOR,
  });
  drawText(page, purchase.code, {
    x: MARGIN,
    y: y - 18,
    size: 18,
    font: fonts.bold,
    color: TEXT_COLOR,
  });
  drawRightAligned(page, `Pasaje ${index + 1} de ${total}`, {
    right: page.getSize().width - MARGIN,
    y: y - 14,
    size: 10,
    font: fonts.regular,
    color: MUTED_COLOR,
  });
  y -= 44;

  y = drawField(page, fonts, y, "Pasajero", `${ticket.lastName}, ${ticket.firstName}`);
  y = drawField(
    page,
    fonts,
    y,
    "Documento",
    `${formatDocument(ticket.documentType)} ${ticket.documentNumber}`,
  );
  y = drawField(page, fonts, y, "Vuelo", flight.code);
  y = drawField(page, fonts, y, "Ruta", `${flight.origin.code} - ${flight.destination.code}`);
  y = drawField(
    page,
    fonts,
    y,
    "Ciudades",
    `${flight.origin.city} - ${flight.destination.city}`,
    10,
  );
  y = drawField(page, fonts, y, "Fecha", formatLongDate(flight.date));
  y = drawField(page, fonts, y, "Salida", `${formatTime(flight.departureAt)} hs`);
  y = drawField(page, fonts, y, "Llegada", `${formatTime(flight.arrivalAt)} hs`);
  y = drawField(page, fonts, y, "Asiento", ticket.seat ?? "Pendiente");
  y = drawField(page, fonts, y, "Clase", SEAT_CLASS_LABELS[ticket.seatClass]);
  y = drawField(page, fonts, y, "E-ticket", ticket.number ?? "Pendiente");
  if (ticket.issuedAt) {
    drawField(page, fonts, y, "Emitido", formatDate(ticket.issuedAt));
  }
  drawTotalFooter(page, fonts, bookingTotal(purchase));
}

export async function buildETicketsPdf(
  purchase: PurchaseComprobantes,
): Promise<Uint8Array> {
  // I3: un pasaje reembolsado o cancelado no es un e-ticket válido. La factura
  // se mantiene intacta: sigue reflejando lo abonado.
  const issuedTickets = purchase.tickets.filter((ticket) => ticket.status === "ISSUED");

  if (issuedTickets.length === 0) {
    throw new Error("TICKETS_NOT_FOUND");
  }

  const pdfDoc = await newDocument(`E-tickets ${purchase.code}`, "Pasajes electronicos");
  const fonts = await embedFonts(pdfDoc);

  issuedTickets.forEach((ticket, index) => {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawETicketPage(page, fonts, purchase, ticket, index, issuedTickets.length);
  });

  return pdfDoc.save({ useObjectStreams: false });
}

const ITEM_COLUMNS = {
  quantityRight: MARGIN + 300,
  unitRight: MARGIN + 400,
  amountRight: PAGE_WIDTH - MARGIN,
  descriptionWidth: 240,
};

const INVOICE_BOTTOM_LIMIT = MARGIN + 110;

function drawInvoiceHeader(
  page: PDFPage,
  fonts: DocumentFonts,
  purchase: PurchaseComprobantes,
): number {
  const { width } = page.getSize();
  const invoice = purchase.invoice;
  let y = drawHeader(page, fonts, "FACTURA ELECTRONICA TIPO B");

  drawText(page, "FACTURA NRO.", {
    x: MARGIN,
    y,
    size: 9,
    font: fonts.regular,
    color: MUTED_COLOR,
  });
  drawText(page, invoice ? formatInvoiceNumber(invoice.number) : "", {
    x: MARGIN,
    y: y - 18,
    size: 18,
    font: fonts.bold,
    color: TEXT_COLOR,
  });
  if (invoice) {
    drawRightAligned(page, `Fecha de emision: ${formatDate(invoice.issuedAt)}`, {
      right: width - MARGIN,
      y: y - 14,
      size: 10,
      font: fonts.regular,
      color: MUTED_COLOR,
    });
  }
  y -= 44;

  if (invoice) {
    y = drawField(page, fonts, y, "Cliente", invoice.customerName);
    y = drawField(page, fonts, y, "Correo", invoice.customerEmail, 10);
  }
  drawField(page, fonts, y, "Reserva", purchase.code);

  return y - 12;
}

function drawItemsTableHeader(page: PDFPage, fonts: DocumentFonts, y: number): number {
  const { width } = page.getSize();
  const size = 9;

  drawText(page, "Concepto", {
    x: MARGIN,
    y,
    size,
    font: fonts.bold,
    color: MUTED_COLOR,
  });
  drawRightAligned(page, "Cant.", {
    right: ITEM_COLUMNS.quantityRight,
    y,
    size,
    font: fonts.bold,
    color: MUTED_COLOR,
  });
  drawRightAligned(page, "P. unitario", {
    right: ITEM_COLUMNS.unitRight,
    y,
    size,
    font: fonts.bold,
    color: MUTED_COLOR,
  });
  drawRightAligned(page, "Subtotal", {
    right: ITEM_COLUMNS.amountRight,
    y,
    size,
    font: fonts.bold,
    color: MUTED_COLOR,
  });
  page.drawLine({
    start: { x: MARGIN, y: y - 6 },
    end: { x: width - MARGIN, y: y - 6 },
    thickness: 0.8,
    color: RULE_COLOR,
  });

  return y - 22;
}

function drawInvoiceItem(
  page: PDFPage,
  fonts: DocumentFonts,
  y: number,
  item: { description: string; quantity: number; unitPrice: string; amount: string },
): number {
  const lines = wrapText(item.description, fonts.regular, 10, ITEM_COLUMNS.descriptionWidth);

  lines.forEach((line, index) => {
    drawText(page, line, {
      x: MARGIN,
      y: y - index * 12,
      size: 10,
      font: fonts.regular,
      color: TEXT_COLOR,
    });
  });
  drawRightAligned(page, String(item.quantity), {
    right: ITEM_COLUMNS.quantityRight,
    y,
    size: 10,
    font: fonts.regular,
    color: TEXT_COLOR,
  });
  drawRightAligned(page, formatCurrency(item.unitPrice), {
    right: ITEM_COLUMNS.unitRight,
    y,
    size: 10,
    font: fonts.regular,
    color: TEXT_COLOR,
  });
  drawRightAligned(page, formatCurrency(item.amount), {
    right: ITEM_COLUMNS.amountRight,
    y,
    size: 10,
    font: fonts.regular,
    color: TEXT_COLOR,
  });

  return y - (lines.length - 1) * 12 - 16;
}

export async function buildInvoicePdf(
  purchase: PurchaseComprobantes,
): Promise<Uint8Array> {
  const invoice = purchase.invoice;
  if (!invoice) {
    throw new Error("INVOICE_NOT_FOUND");
  }

  const pdfDoc = await newDocument(
    `Factura ${invoice.number}`,
    "Factura electronica tipo B",
  );
  const fonts = await embedFonts(pdfDoc);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = drawInvoiceHeader(page, fonts, purchase);
  y = drawItemsTableHeader(page, fonts, y);

  for (const item of invoice.items) {
    // Se reserva espacio para el total antes de dibujar la fila.
    const rowHeight =
      wrapText(item.description, fonts.regular, 10, ITEM_COLUMNS.descriptionWidth).length * 12 +
      4;

    if (y - rowHeight < INVOICE_BOTTOM_LIMIT) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = drawHeader(page, fonts, "FACTURA ELECTRONICA TIPO B (continuacion)");
      y = drawItemsTableHeader(page, fonts, y);
    }

    y = drawInvoiceItem(page, fonts, y, item);
  }

  if (y - 48 < MARGIN) {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = drawHeader(page, fonts, "FACTURA ELECTRONICA TIPO B (continuacion)");
  }

  const { width } = page.getSize();
  page.drawLine({
    start: { x: MARGIN, y: y + 6 },
    end: { x: width - MARGIN, y: y + 6 },
    thickness: 0.8,
    color: RULE_COLOR,
  });
  drawText(page, "TOTAL ABONADO: ", {
    x: MARGIN,
    y: y - 16,
    size: 11,
    font: fonts.regular,
    color: MUTED_COLOR,
  });
  drawRightAligned(page, formatCurrency(invoice.totalAmount), {
    right: width - MARGIN,
    y: y - 16,
    size: 13,
    font: fonts.bold,
    color: TEXT_COLOR,
  });

  return pdfDoc.save({ useObjectStreams: false });
}
