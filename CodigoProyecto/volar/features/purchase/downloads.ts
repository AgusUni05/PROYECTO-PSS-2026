import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBookingComprobantesForBuyer } from "./queries";
import type { PurchaseComprobantes } from "./queries";
import { bookingCodeSchema } from "./schema";
import type { PurchaseDocumentKind } from "./document-types";
import {
  buildBoardingPassesFilename,
  buildBoardingPassesPdf,
  buildETicketsFilename,
  buildETicketsPdf,
  buildInvoiceFilename,
  buildInvoicePdf,
} from "./documents";

// US-36: descarga autenticada de los comprobantes. Los PDF se generan en cada
// request desde la base; nunca se aceptan bytes, rutas ni identidades del
// cliente. La titularidad sale únicamente de la sesión (getCurrentUser).

export type PurchaseDownloadAccess =
  | { ok: true; purchase: PurchaseComprobantes }
  | { ok: false; status: 401 | 403 | 404 | 409; error: string };

const NOT_FOUND_ERROR = "Compra no encontrada";

/**
 * Resuelve el acceso del usuario de la sesión al comprobante de una reserva.
 * Una reserva ajena y una inexistente devuelven exactamente el mismo 404 para
 * no revelar si el código existe en otra cuenta.
 */
export async function authorizePurchaseDownload(
  rawCode: string,
): Promise<PurchaseDownloadAccess> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, status: 401, error: "No autorizado" };
  if (!user.isActive) return { ok: false, status: 403, error: "Cuenta desactivada" };

  const code = bookingCodeSchema.safeParse(rawCode);
  if (!code.success) return { ok: false, status: 404, error: NOT_FOUND_ERROR };

  const purchase = await getBookingComprobantesForBuyer(code.data, user.id);
  if (!purchase) return { ok: false, status: 404, error: NOT_FOUND_ERROR };

  if (purchase.status !== "CONFIRMED") {
    return { ok: false, status: 409, error: "La compra no está confirmada" };
  }

  return { ok: true, purchase };
}

/** US-36/US-38: los builders señalan un comprobante ausente con estos códigos. */
const MISSING_DOCUMENT_ERRORS = new Set([
  "TICKETS_NOT_FOUND",
  "INVOICE_NOT_FOUND",
  "BOARDING_PASSES_NOT_FOUND",
]);

function isMissingDocumentError(error: unknown): boolean {
  return error instanceof Error && MISSING_DOCUMENT_ERRORS.has(error.message);
}

/** Cómo se genera y se nombra cada comprobante descargable. */
function documentFor(kind: PurchaseDocumentKind) {
  switch (kind) {
    case "etickets":
      return { build: buildETicketsPdf, filename: buildETicketsFilename };
    case "invoice":
      return { build: buildInvoicePdf, filename: buildInvoiceFilename };
    case "boarding-passes":
      return { build: buildBoardingPassesPdf, filename: buildBoardingPassesFilename };
  }
}

/**
 * Respuesta HTTP del PDF pedido: autoriza, genera los bytes y fija las cabeceras
 * de descarga. Los errores inesperados se traducen a un 500 genérico para no
 * filtrar mensajes internos, SQL ni datos del comprador.
 */
export async function purchasePdfResponse(
  rawCode: string,
  kind: PurchaseDocumentKind,
): Promise<NextResponse> {
  const document = documentFor(kind);

  try {
    const access = await authorizePurchaseDownload(rawCode);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { purchase } = access;
    const pdf = await document.build(purchase);
    const filename = document.filename(purchase.code);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (isMissingDocumentError(error)) {
      return NextResponse.json({ error: "Comprobante no disponible" }, { status: 404 });
    }
    console.error("Error al generar el comprobante de compra:", error);
    return NextResponse.json(
      { error: "No se pudo generar el comprobante" },
      { status: 500 },
    );
  }
}
