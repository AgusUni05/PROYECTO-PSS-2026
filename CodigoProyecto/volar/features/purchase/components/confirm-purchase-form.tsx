"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/features/flights/format";
import type { SeatClass } from "@/generated/prisma/enums";
import { confirmPurchaseAction } from "../actions";

type Props = {
  flightId: string;
  seatClass: SeatClass;
  maxAvailable: number;
  fare: string;
};

// US-15: cantidad de 1 a 9 (acotada además al cupo disponible de la clase
// elegida) y confirmación, que retiene el cupo con un hold de 10 minutos.
export function ConfirmPurchaseForm({ flightId, seatClass, maxAvailable, fare }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const maxQuantity = Math.min(9, maxAvailable);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  function clamp(value: number): number {
    if (Number.isNaN(value)) return 1;
    return Math.min(maxQuantity, Math.max(1, Math.trunc(value)));
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await confirmPurchaseAction({
        vuelo: flightId,
        clase: seatClass,
        cantidad: quantity,
      });
      if (!result.ok) {
        const message =
          result.error ?? result.fieldErrors?.cantidad?.[0] ?? "No se pudo confirmar la compra";
        setError(message);
        toast.error(message);
        return;
      }
      router.push(`/compra/reserva/${result.data.id}`);
    });
  }

  return (
    <div className="space-y-4 border-t border-dashed border-border pt-4">
      <div className="space-y-1.5">
        <Label htmlFor="cantidad">Cantidad de pasajes</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={quantity <= 1 || isPending}
            onClick={() => setQuantity((q) => clamp(q - 1))}
            aria-label="Restar un pasaje"
          >
            −
          </Button>
          <Input
            id="cantidad"
            type="number"
            inputMode="numeric"
            min={1}
            max={maxQuantity}
            value={quantity}
            disabled={isPending}
            onChange={(e) => setQuantity(clamp(Number(e.target.value)))}
            className="w-16 text-center"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={quantity >= maxQuantity || isPending}
            onClick={() => setQuantity((q) => clamp(q + 1))}
            aria-label="Sumar un pasaje"
          >
            +
          </Button>
          <span className="text-xs text-muted-foreground">Máx. {maxQuantity} por compra</span>
        </div>
      </div>

      <div className="flex items-end justify-between border-t border-dashed border-border pt-4">
        <span className="text-[13px] font-semibold text-muted-foreground">Total a pagar</span>
        <strong className="text-[28px] font-extrabold tracking-[-0.03em]">
          {formatCurrency(Number(fare) * quantity)}
        </strong>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button type="button" className="w-full" disabled={isPending} onClick={handleConfirm}>
        {isPending ? "Confirmando…" : "Confirmar cantidad y clase"}
      </Button>
    </div>
  );
}
