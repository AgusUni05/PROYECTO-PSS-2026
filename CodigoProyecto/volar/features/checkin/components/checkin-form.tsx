"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SEAT_CLASS_LABELS } from "@/features/flight-search/class-options";
import { checkInAction } from "../actions";
import type { CheckinPassenger } from "../queries";

function documentLabel(passenger: CheckinPassenger): string {
  return `${passenger.documentType === "DNI" ? "DNI" : "Pasaporte"} ${passenger.documentNumber}`;
}

// US-38: elegir pasajeros (columna "Incluir" del wireframe), aceptar la
// declaración y confirmar. Los que ya hicieron el check-in no se pueden elegir.
export function CheckinForm({ code, passengers }: { code: string; passengers: CheckinPassenger[] }) {
  const router = useRouter();
  const pendingIds = passengers.filter((p) => p.checkedInAt === null).map((p) => p.id);
  const [selected, setSelected] = useState<string[]>(pendingIds);
  const [declared, setDeclared] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string, checked: boolean) {
    setSelected((current) => (checked ? [...current, id] : current.filter((value) => value !== id)));
  }

  function submit() {
    startTransition(async () => {
      const result = await checkInAction({ reserva: code, pasajes: selected, declaracion: declared as true });
      if (!result.ok) {
        toast.error(result.error ?? "No se pudo hacer el check-in.");
        return;
      }
      const count = result.data.checkedIn;
      toast.success(count === 1 ? "Check-in confirmado para 1 pasajero." : `Check-in confirmado para ${count} pasajeros.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border rounded-xl border border-border">
        {passengers.map((passenger) => {
          const done = passenger.checkedInAt !== null;
          const inputId = `checkin-${passenger.id}`;
          return (
            <li key={passenger.id} className="flex min-w-0 items-center gap-3 px-3.5 py-3">
              {done ? (
                <span className="shrink-0 rounded-full bg-success-muted px-2.5 py-1 text-xs font-bold text-success">
                  Check-in hecho
                </span>
              ) : (
                <input
                  id={inputId}
                  type="checkbox"
                  checked={selected.includes(passenger.id)}
                  onChange={(event) => toggle(passenger.id, event.target.checked)}
                  className="size-4 shrink-0 cursor-pointer accent-primary"
                />
              )}
              <label htmlFor={done ? undefined : inputId} className={done ? "min-w-0" : "min-w-0 cursor-pointer"}>
                <span className="block text-sm font-bold break-words">{`${passenger.lastName}, ${passenger.firstName}`}</span>
                <span className="block text-xs text-muted-foreground">
                  {`${documentLabel(passenger)} · ${SEAT_CLASS_LABELS[passenger.seatClass]} · Asiento ${passenger.seat ?? "—"}`}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={declared}
          onChange={(event) => setDeclared(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
        />
        <span>Declaro que los pasajeros no transportan mercancías peligrosas ni objetos prohibidos.</span>
      </label>

      <Button
        type="button"
        onClick={submit}
        disabled={isPending || selected.length === 0 || !declared}
        className="min-h-11 w-full sm:w-auto"
      >
        {isPending ? "Confirmando…" : `Confirmar check-in (${selected.length})`}
      </Button>
    </div>
  );
}
