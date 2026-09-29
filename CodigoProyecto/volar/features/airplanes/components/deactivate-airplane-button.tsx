"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deactivateAirplaneAction } from "../actions";

type Props = {
  id: string;
  label: string;
  blockedReason?: string;
};

// US-02: baja lógica con confirmación explícita; deshabilitada con motivo si hay vuelos futuros.
export function DeactivateAirplaneButton({ id, label, blockedReason }: Props) {
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
      const result = await deactivateAirplaneAction(id);
      if (!result.ok) {
        toast.error(result.error ?? "No se pudo dar de baja el avión");
        return;
      }
      toast.success("Avión dado de baja");
      setOpen(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
        Dar de Baja
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dar de baja {label}</AlertDialogTitle>
          <AlertDialogDescription>
            El avión dejará de estar disponible para asignar a nuevos vuelos. Esta acción se
            puede revertir editándolo más adelante.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isPending} onClick={handleConfirm}>
            {isPending ? "Dando de baja…" : "Confirmar Baja"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
