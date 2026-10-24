import { buttonVariants } from "@/components/ui/button";

export type PurchaseDocumentKind = "etickets" | "invoice";

/**
 * US-36: URL interna del comprobante. El código de reserva solo se codifica
 * para que viaje seguro como segmento de ruta; la autorización y la generación
 * del PDF quedan del lado del servidor.
 */
export function purchaseDocumentUrl(code: string, kind: PurchaseDocumentKind): string {
  const encodedCode = encodeURIComponent(code);
  return kind === "etickets"
    ? `/api/compras/${encodedCode}/etickets`
    : `/api/compras/${encodedCode}/factura`;
}

// 44 px de alto mínimo para el touch target y ancho completo en mobile.
const LINK_CLASS = "min-h-11 w-full justify-center sm:w-auto";

/**
 * US-36: descargas reales de e-tickets y factura fiscal. Es un link interno a
 * las rutas autorizadas (sin lógica de PDF ni tokens en el cliente) y solo
 * muestra los comprobantes que existen para la compra.
 */
export function PurchaseDownloadActions({
  code,
  ticketCount,
  hasInvoice,
  canDownload,
}: {
  code: string;
  ticketCount: number;
  hasInvoice: boolean;
  canDownload: boolean;
}): React.ReactElement {
  if (!canDownload) {
    return (
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">
          Los comprobantes no están disponibles porque la compra no está confirmada.
        </p>
      </div>
    );
  }

  const hasTickets = ticketCount > 0;

  if (!hasTickets && !hasInvoice) {
    return (
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">
          Los comprobantes de esta compra no están disponibles.
        </p>
      </div>
    );
  }

  const ticketsLabel =
    ticketCount === 1
      ? "Descargar E-Tickets (1 pasaje PDF)"
      : `Descargar E-Tickets (${ticketCount} pasajes PDF)`;

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
      {hasTickets && (
        <a
          href={purchaseDocumentUrl(code, "etickets")}
          download
          className={buttonVariants({ className: LINK_CLASS })}
        >
          {ticketsLabel}
        </a>
      )}

      {hasInvoice && (
        <a
          href={purchaseDocumentUrl(code, "invoice")}
          download
          className={buttonVariants({ variant: "outline", className: LINK_CLASS })}
        >
          Descargar Factura Fiscal B (PDF)
        </a>
      )}

      {!hasInvoice && (
        <p className="text-xs text-muted-foreground">
          La factura fiscal todavía no está disponible.
        </p>
      )}
    </div>
  );
}
