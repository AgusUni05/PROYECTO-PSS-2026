import { formatCurrency, formatDate } from "@/features/flights/format";
import type { PurchaseComprobantes } from "../queries";

// US-23/US-33/US-34: desglose de la factura de una compra confirmada.
export function InvoiceSection({ booking }: { booking: PurchaseComprobantes }) {
  const invoice = booking.invoice;
  if (!invoice) return null;

  return (
    <section className="rounded-2xl border border-border bg-muted/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-foreground pb-2">
        <div>
          <h3 className="text-[15px] font-extrabold">FACTURA ELECTRÓNICA</h3>
          <p className="text-xs text-muted-foreground">
            N° {invoiceNumber(invoice.number)} · Fecha: {formatDate(invoice.issuedAt)}
          </p>
        </div>
        <p className="text-xs">
          Titular: <b>{invoice.customerName}</b>
        </p>
      </div>

      <table className="mt-3 w-full border-collapse bg-card text-[13px]">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-semibold">Concepto</th>
            <th className="py-2 pr-3 text-right font-semibold">Cant.</th>
            <th className="py-2 pr-3 text-right font-semibold">Tarifa</th>
            <th className="py-2 text-right font-semibold">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id} className="border-b border-border/60 last:border-0">
              <td className="py-2 pr-3">{item.description}</td>
              <td className="py-2 pr-3 text-right">{item.quantity}</td>
              <td className="py-2 pr-3 text-right">{formatCurrency(item.unitPrice)}</td>
              <td className="py-2 text-right">{formatCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {booking.transactionId && (
          <p className="text-xs text-muted-foreground">Transacción pasarela: {booking.transactionId}</p>
        )}
        <p className="text-[15px] font-extrabold">TOTAL ABONADO: {formatCurrency(invoice.totalAmount)}</p>
      </div>
    </section>
  );
}

function invoiceNumber(number: number): string {
  return `0001-${String(number).padStart(8, "0")}`;
}
