"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reactivateAirportAction } from "../actions";

type Props = {
  id: string;
};

// Vuelve a activar un aeropuerto dado de baja (sin confirmación: no tiene efectos destructivos).
export function ReactivateAirportButton({ id }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await reactivateAirportAction(id);
      if (!result.ok) {
        toast.error(result.error ?? "No se pudo reactivar el aeropuerto");
        return;
      }
      toast.success("Aeropuerto reactivado");
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      {isPending ? "Reactivando…" : "Reactivar"}
    </Button>
  );
}
