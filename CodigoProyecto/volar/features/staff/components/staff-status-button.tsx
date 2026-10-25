"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { deactivateStaffAction, reactivateStaffAction } from "../actions";

type Props = {
  id: string;
  label: string;
  isActive: boolean;
};

// US-31: deshabilitar (con confirmación) o reactivar una cuenta de personal.
export function StaffStatusButton({ id, label, isActive }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDeactivate() {
    startTransition(async () => {
      const result = await deactivateStaffAction(id);
      if (!result.ok) {
        toast.error(result.error ?? "No se pudo deshabilitar la cuenta");
        return;
      }
      toast.success("Cuenta deshabilitada");
      setOpen(false);
    });
  }

  function handleReactivate() {
    startTransition(async () => {
      const result = await reactivateStaffAction(id);
      if (!result.ok) {
        toast.error(result.error ?? "No se pudo reactivar la cuenta");
        return;
      }
      toast.success("Cuenta reactivada");
    });
  }

  if (!isActive) {
    return (
      <Button variant="outline" size="sm" disabled={isPending} onClick={handleReactivate}>
        {isPending ? "Reactivando…" : "Reactivar"}
      </Button>
    );
  }

  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={setOpen}
      triggerLabel="Deshabilitar"
      triggerSize="sm"
      title={`Deshabilitar la cuenta de ${label}`}
      description={
        <>
          La cuenta no podrá iniciar sesión a partir de ahora. No se borra: sus operaciones
          registradas se conservan (trazabilidad) y se puede reactivar más adelante.
        </>
      }
      confirmLabel="Confirmar"
      actionVariant="destructive"
      pendingLabel="Deshabilitando…"
      isPending={isPending}
      onConfirm={handleDeactivate}
    />
  );
}
