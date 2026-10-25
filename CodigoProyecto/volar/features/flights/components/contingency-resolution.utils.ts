import type { ActionResult } from "@/lib/action-result";
import { formatCurrency } from "@/features/flights/format";
import { resolveRebookingAction } from "@/features/flights/contingency-actions";

export type ResolutionConfirmation = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
};

export function buildRefundConfirmation(amount: number): ResolutionConfirmation {
  return {
    title: "Confirmar reembolso",
    description: `Se reembolsarán ${formatCurrency(amount)} y el pasaje quedará reembolsado. Esta acción no se puede deshacer.`,
    confirmLabel: "Confirmar reembolso",
    cancelLabel: "Volver",
  };
}

export function buildRebookingConfirmation(flightCode: string): ResolutionConfirmation {
  return {
    title: "Confirmar reprogramación",
    description: `El pasaje se moverá al vuelo ${flightCode} sin costo adicional. Esta acción no se puede deshacer desde este enlace.`,
    confirmLabel: "Confirmar reprogramación",
    cancelLabel: "Volver",
  };
}

export async function submitRebooking(
  token: string,
  flightId: string,
): Promise<ActionResult<{ ticketNumber: string; flightCode: string; seat: string }>> {
  return resolveRebookingAction(token, flightId);
}
