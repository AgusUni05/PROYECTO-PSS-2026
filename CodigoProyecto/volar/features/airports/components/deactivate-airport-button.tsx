"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { deactivateAirportAction } from "../actions";

type Props = {
  id: string;
  label: string;
  /** Si está presente, el botón queda deshabilitado con este motivo en un tooltip. */
  blockedReason?: string;
};

// US-01: baja lógica con confirmación explícita; deshabilitada con motivo si hay vuelos futuros.
export function DeactivateAirportButton({ id, label, blockedReason }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (blockedReason) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span tabIndex={0} className="inline-block" />}>
          <Button variant="secondary" size="sm" disabled>
            Dar de Baja
          </Button>
        </TooltipTrigger>
        <TooltipContent>{blockedReason}</TooltipContent>
      </Tooltip>
    );
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await deactivateAirportAction(id);
      if (!result.ok) {
        toast.error(result.error ?? "No se pudo dar de baja el aeropuerto");
        return;
      }
      toast.success("Aeropuerto dado de baja");
      setOpen(false);
    });
  }

  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={setOpen}
      triggerLabel="Dar de Baja"
      triggerSize="sm"
      title={`Dar de baja ${label}`}
      description="El aeropuerto dejará de estar disponible para elegir como origen o destino de nuevos trayectos. Esta acción se puede revertir editándolo más adelante."
      confirmLabel="Confirmar Baja"
      actionVariant="destructive"
      pendingLabel="Dando de baja…"
      isPending={isPending}
      onConfirm={handleConfirm}
    />
  );
}
