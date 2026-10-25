import type { PurchaseDocumentKind } from "../document-types";

/** Construye la ruta interna del comprobante sin trasladar autorización al cliente. */
export function purchaseDocumentUrl(code: string, kind: PurchaseDocumentKind): string {
  const encodedCode = encodeURIComponent(code);
  return kind === "etickets"
    ? `/api/compras/${encodedCode}/etickets`
    : `/api/compras/${encodedCode}/factura`;
}
