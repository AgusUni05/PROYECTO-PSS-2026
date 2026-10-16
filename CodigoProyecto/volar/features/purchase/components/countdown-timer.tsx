"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { expireBookingAction } from "../actions";

type Props = {
  bookingId: string;
  /** ISO string: un Date de servidor no cruza a un Client Component. */
  expiresAt: string;
  /** A dónde volver cuando se agota el tiempo. */
  backHref: string;
};

const WARNING_THRESHOLD_MS = 60_000;

// US-15/US-17: cuenta regresiva del hold de 10 minutos. Al llegar a 0, vence
// la reserva en el servidor (libera el cupo) y notifica al pasajero.
export function CountdownTimer({ bookingId, expiresAt, backHref }: Props) {
  const router = useRouter();
  const target = new Date(expiresAt).getTime();
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(Math.max(0, target - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  useEffect(() => {
    if (remainingMs > 0) return;
    let active = true;
    expireBookingAction(bookingId)
      // Si no se pudo consultar, se asume vencida igual que antes.
      .catch(() => true)
      .then((expired) => {
        // false: la reserva ya se pagó o rechazó (p.ej. desde el paso Pago); no hay nada que liberar.
        if (!active || !expired) return;
        toast.error("Se agotó el tiempo para completar la compra. Los cupos se liberaron.");
        router.push(backHref);
      });
    return () => {
      active = false;
    };
  }, [remainingMs, bookingId, backHref, router]);

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const urgent = remainingMs > 0 && remainingMs <= WARNING_THRESHOLD_MS;

  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-muted px-4 py-3">
      <span className="text-xs font-semibold text-muted-foreground">Tiempo restante para completar la compra</span>
      <span
        className={cn(
          "font-mono text-[28px] font-extrabold tabular-nums tracking-[-0.02em]",
          urgent ? "text-destructive" : "text-foreground",
        )}
        role="timer"
        aria-live="polite"
      >
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}
