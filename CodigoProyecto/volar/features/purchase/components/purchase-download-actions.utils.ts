import type { PurchaseDocumentKind } from "../document-types";

/** Construye la ruta interna del comprobante sin trasladar autorización al cliente. */
export function purchaseDocumentUrl(code: string, kind: PurchaseDocumentKind): string {
  const encodedCode = encodeURIComponent(code);
  const path = { etickets: "etickets", invoice: "factura", "boarding-passes": "tarjetas-embarque" }[kind];
  return `/api/compras/${encodedCode}/${path}`;
}
