import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { PurchaseDownloadActions } from "./purchase-download-actions";
import { purchaseDocumentUrl } from "./purchase-download-actions.utils";

function render(props: {
  code: string;
  ticketCount: number;
  hasInvoice: boolean;
  canDownload?: boolean;
}): string {
  const { canDownload = true, ...rest } = props;
  return renderToString(<PurchaseDownloadActions canDownload={canDownload} {...rest} />);
}

function anchors(html: string): string[] {
  return html.match(/<a\b[^>]*>/g) ?? [];
}

// US-36: los botones de descarga son links internos a las rutas autorizadas.
describe("purchaseDocumentUrl", () => {
  it("arma las rutas internas de e-tickets y factura", () => {
    expect(purchaseDocumentUrl("VOL-ABC123", "etickets")).toBe(
      "/api/compras/VOL-ABC123/etickets",
    );
    expect(purchaseDocumentUrl("VOL-ABC123", "invoice")).toBe("/api/compras/VOL-ABC123/factura");
  });

  it("escapa caracteres especiales del código de reserva", () => {
    expect(purchaseDocumentUrl("VOL 12/34", "etickets")).toBe(
      "/api/compras/VOL%2012%2F34/etickets",
    );
    expect(purchaseDocumentUrl("VOL 12/34", "invoice")).toBe(
      "/api/compras/VOL%2012%2F34/factura",
    );
  });
});

describe("PurchaseDownloadActions", () => {
  it("muestra ambos links cuando hay pasajes y factura", () => {
    const html = render({ code: "VOL-ABC123", ticketCount: 2, hasInvoice: true });

    expect(html).toContain("Descargar E-Tickets (2 pasajes PDF)");
    expect(html).toContain("Descargar Factura Fiscal B (PDF)");
    expect(html).toContain('href="/api/compras/VOL-ABC123/etickets"');
    expect(html).toContain('href="/api/compras/VOL-ABC123/factura"');
  });

  it("usa el singular para un solo pasaje", () => {
    const html = render({ code: "VOL-ABC123", ticketCount: 1, hasInvoice: true });

    expect(html).toContain("Descargar E-Tickets (1 pasaje PDF)");
    expect(html).not.toContain("1 pasajes PDF");
  });

  it("oculta el link de e-tickets cuando no hay pasajes y conserva la factura", () => {
    const html = render({ code: "VOL-ABC123", ticketCount: 0, hasInvoice: true });

    expect(html).not.toContain('href="/api/compras/VOL-ABC123/etickets"');
    expect(html).not.toContain("0 pasajes");
    expect(html).not.toContain("Descargar E-Tickets");
    expect(html).toContain('href="/api/compras/VOL-ABC123/factura"');
    expect(html).toContain("Descargar Factura Fiscal B (PDF)");
  });

  it("oculta la factura y explica que todavía no está disponible", () => {
    const html = render({ code: "VOL-ABC123", ticketCount: 2, hasInvoice: false });

    expect(html).toContain('href="/api/compras/VOL-ABC123/etickets"');
    expect(html).not.toContain('href="/api/compras/VOL-ABC123/factura"');
    expect(html.match(/La factura fiscal todavía no está disponible\./g)).toHaveLength(1);
  });

  it("muestra solo el mensaje combinado cuando no hay ningún comprobante", () => {
    const html = render({ code: "VOL-ABC123", ticketCount: 0, hasInvoice: false });

    expect(html).toContain("Los comprobantes de esta compra no están disponibles.");
    expect(html).not.toContain("La factura fiscal todavía no está disponible.");
    expect(html).not.toContain("/api/compras/");
    expect(html).not.toContain("<a");
    expect(html).not.toContain("<button");
  });

  it("codifica el código de reserva al construir el href", () => {
    const html = render({ code: "VOL 12/34", ticketCount: 1, hasInvoice: true });

    expect(html).toContain('href="/api/compras/VOL%2012%2F34/etickets"');
    expect(html).toContain('href="/api/compras/VOL%2012%2F34/factura"');
    expect(html).not.toContain('href="/api/compras/VOL 12/34');
  });

  it("oculta todas las descargas cuando la compra no está confirmada", () => {
    const html = render({
      code: "VOL-ABC123",
      ticketCount: 2,
      hasInvoice: true,
      canDownload: false,
    });

    expect(html).toContain(
      "Los comprobantes no están disponibles porque la compra no está confirmada.",
    );
    expect(html).not.toContain("/api/compras/");
    expect(html).not.toContain("Descargar E-Tickets");
    expect(html).not.toContain("Descargar Factura Fiscal B (PDF)");
    expect(html).not.toContain("La factura fiscal todavía no está disponible.");
    expect(anchors(html)).toHaveLength(0);
  });

  it("renderiza links reales con download, no botones deshabilitados", () => {
    const html = render({ code: "VOL-ABC123", ticketCount: 2, hasInvoice: true });
    const tags = anchors(html);

    expect(tags).toHaveLength(2);
    for (const tag of tags) {
      expect(tag).toContain("download");
      // `disabled:` utilities de buttonVariants no son un atributo disabled.
      expect(tag).not.toMatch(/\sdisabled=/);
      expect(tag).not.toContain('aria-disabled="true"');
    }
    expect(html).not.toContain("<button");
    expect(html).not.toContain("US-36");
    expect(html).not.toContain("La descarga estará disponible");
  });
});
