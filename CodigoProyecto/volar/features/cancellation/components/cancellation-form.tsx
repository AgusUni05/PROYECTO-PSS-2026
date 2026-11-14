"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { cancelBookingAction } from "../actions";
import { formatPesos } from "../format";
import { CANCELLATION_REASON_LABELS, CANCELLATION_REASONS, type CancellationReason } from "../policy";
import type { CancellationQuote } from "../quote";

// US-39: motivo, aceptación de que es irreversible y confirmación final.
export function CancellationForm({ quote }: { quote: CancellationQuote }) {
  const router = useRouter();
  const [reason, setReason] = useState<CancellationReason | "">("");
  const [accepted, setAccepted] = useState(false);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const passengers = quote.lines.length === 1 ? "el pasaje" : `los ${quote.lines.length} pasajes`;

  function confirm() {
    if (!reason) return;
    startTransition(async () => {
      const result = await cancelBookingAction({
        reserva: quote.code,
        motivo: reason,
        confirmacion: accepted as true,
      });
      if (!result.ok) {
        toast.error(result.error ?? "No se pudo cancelar la reserva.");
        setOpen(false);
        return;
      }
      toast.success(`Reserva cancelada. Te reintegramos ${formatPesos(result.data.refund)}.`);
      router.push("/cuenta");
      router.refresh();
    });
  }

  return (
    <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="grid gap-1.5">
        <Label htmlFor="motivo">Motivo de la cancelación</Label>
        <NativeSelect
          id="motivo"
          value={reason}
          onChange={(event) => setReason(event.target.value as CancellationReason | "")}
          className="cursor-pointer"
        >
          <option value="">Elegí un motivo</option>
          {CANCELLATION_REASONS.map((value) => (
            <option key={value} value={value}>
              {CANCELLATION_REASON_LABELS[value]}
            </option>
          ))}
        </NativeSelect>
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
        />
        <span>
          {`Comprendo que la cancelación voluntaria es irreversible y que se retienen ${formatPesos(quote.totals.penalty)} por la política de penalidades.`}
        </span>
      </label>

      <ConfirmActionDialog
        open={open}
        onOpenChange={setOpen}
        triggerLabel={`Solicitar cancelación (reintegro ${formatPesos(quote.totals.refund)})`}
        triggerClassName="min-h-11 w-full sm:w-fit"
        triggerDisabled={!reason || !accepted}
        title={`¿Cancelar la reserva ${quote.code}?`}
        description={`Se cancelan ${passengers}, se reintegran ${formatPesos(quote.totals.refund)} a ${quote.paymentMethod} y se retienen ${formatPesos(quote.totals.penalty)}. Los asientos se liberan para la venta. No se puede deshacer.`}
        confirmLabel="Confirmar cancelación y reembolso"
        cancelLabel="Conservar mi reserva"
        pendingLabel="Cancelando…"
        actionVariant="destructive"
        isPending={isPending}
        onConfirm={confirm}
      />
    </section>
  );
}
