import { formatPesos } from "../format";
import type { CancellationQuote } from "../quote";

/** US-39: texto del diálogo de confirmación, en singular o plural según los pasajes. */
export function cancellationConfirmationText(quote: CancellationQuote): string {
  const single = quote.lines.length === 1;
  const tickets = single ? "Se cancela el pasaje" : `Se cancelan los ${quote.lines.length} pasajes`;
  const seats = single ? "El asiento se libera" : "Los asientos se liberan";
  return `${tickets}, se reintegran ${formatPesos(quote.totals.refund)} a ${quote.paymentMethod} y se retienen ${formatPesos(quote.totals.penalty)}. ${seats} para la venta. No se puede deshacer.`;
}
