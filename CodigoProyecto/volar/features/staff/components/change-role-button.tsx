"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
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
import { changeStaffRoleAction } from "../actions";
import { STAFF_ROLE_LABELS, STAFF_ROLES, type StaffRole } from "../schema";

type Props = {
  id: string;
  label: string;
  role: StaffRole;
};

// US-31: cambio de rol de una cuenta de personal (Administrador ↔ Empleado de Mostrador).
export function ChangeRoleButton({ id, label, role }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<StaffRole>(role);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await changeStaffRoleAction(id, selected);
      if (!result.ok) {
        toast.error(result.error ?? "No se pudo cambiar el rol");
        return;
      }
      toast.success("Rol actualizado");
      setOpen(false);
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSelected(role);
      }}
    >
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        Editar Rol
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Editar rol de {label}</AlertDialogTitle>
          <AlertDialogDescription>
            El cambio aplica desde su próxima acción en el sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor={`rol-${id}`}>Rol en el Sistema</Label>
          <NativeSelect
            id={`rol-${id}`}
            value={selected}
            onChange={(event) => setSelected(event.target.value as StaffRole)}
          >
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {STAFF_ROLE_LABELS[r]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={isPending || selected === role} onClick={handleConfirm}>
            {isPending ? "Guardando…" : "Guardar Rol"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
