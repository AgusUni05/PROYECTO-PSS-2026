"use client";

import { useState, useTransition } from "react";
import { Ban, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cancelFlightAction } from "../actions";
import {
  CANCELLATION_REASONS,
  CANCELLATION_REASON_LABELS,
  type CancellationReason,
} from "../schema";
import { formatDate } from "../format";
import type { FlightListItem } from "../queries";

type CancellableFlight = Pick<
  FlightListItem,
  "id" | "code" | "date" | "originCode" | "destinationCode" | "issuedTickets"
>;

// US-06: cancelación puntual de un vuelo con confirmación explícita y motivo obligatorio.
export function CancelFlightButton({ flight }: { flight: CancellableFlight }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<CancellationReason | "">("");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    if (!reason) return;
    startTransition(async () => {
      const result = await cancelFlightAction(flight.id, { reason });
      if (!result.ok) {
        toast.error(result.error ?? "No se pudo cancelar el vuelo");
        return;
      }
      toast.success(`Vuelo ${flight.code} cancelado`);
      setOpen(false);
      setReason("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>
        Cancelar Vuelo
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="flex-row items-start gap-3.5 space-y-0">
          <span className="grid size-[42px] flex-none place-items-center rounded-xl bg-destructive/10 text-destructive">
            <Ban className="size-5" />
          </span>
          <div>
            <DialogTitle>Confirmar cancelación de vuelo</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés cancelar el vuelo {flight.code} del {formatDate(flight.date)} (
              {flight.originCode} → {flight.destinationCode})?
            </DialogDescription>
          </div>
        </DialogHeader>

        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Acción irreversible</AlertTitle>
          <AlertDescription>
            <ul className="m-0 list-disc space-y-1 pl-4">
              <li>
                El vuelo pasa a estado <strong>Cancelado</strong>; no se elimina de la base.
              </li>
              <li>Deja de aparecer en las búsquedas del portal público.</li>
              {flight.issuedTickets > 0 ? (
                <li>
                  Se registrará el aviso de contingencia para los{" "}
                  <strong>{flight.issuedTickets} pasajeros</strong> con pasajes emitidos (RF-10).
                </li>
              ) : (
                <li>Este vuelo no tiene pasajes vendidos: no se generan avisos.</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-1.5">
          <Label htmlFor="cancel-flight-reason">Motivo operativo de cancelación *</Label>
          <NativeSelect
            id="cancel-flight-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value as CancellationReason)}
          >
            <option value="">Seleccioná un motivo…</option>
            {CANCELLATION_REASONS.map((r) => (
              <option key={r} value={r}>
                {CANCELLATION_REASON_LABELS[r]}
              </option>
            ))}
          </NativeSelect>
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            No, Mantener Vuelo
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={!reason || isPending}
            onClick={handleConfirm}
          >
            {isPending ? "Cancelando…" : "Confirmar y Cancelar Vuelo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
