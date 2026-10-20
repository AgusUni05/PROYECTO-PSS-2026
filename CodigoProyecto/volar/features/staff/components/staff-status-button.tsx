"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
        Deshabilitar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deshabilitar la cuenta de {label}</AlertDialogTitle>
          <AlertDialogDescription>
            La cuenta no podrá iniciar sesión a partir de ahora. No se borra: sus operaciones
            registradas se conservan (trazabilidad) y se puede reactivar más adelante.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isPending} onClick={handleDeactivate}>
            {isPending ? "Deshabilitando…" : "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
