"use client";

import { useState, useTransition } from "react";
import { Ban, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { cancelRouteFlightsAction } from "../actions";
import {
  CANCELLATION_REASONS,
  CANCELLATION_REASON_LABELS,
  type CancellationReason,
} from "../schema";
import type { RouteForCancellationOption } from "../queries";

// US-06: cancelación masiva de todos los vuelos programados futuros de un trayecto.
export function CancelRouteFlightsButton({ routes }: { routes: RouteForCancellationOption[] }) {
  const [open, setOpen] = useState(false);
  const [routeId, setRouteId] = useState("");
  const [reason, setReason] = useState<CancellationReason | "">("");
  const [isPending, startTransition] = useTransition();

  const selectedRoute = routes.find((r) => r.id === routeId);

  if (routes.length === 0) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span tabIndex={0} className="inline-block" />}>
          <Button variant="secondary" disabled>
            Cancelar Todos los Vuelos de un Trayecto
          </Button>
        </TooltipTrigger>
        <TooltipContent>No hay trayectos con vuelos programados futuros</TooltipContent>
      </Tooltip>
    );
  }

  function handleConfirm() {
    if (!routeId || !reason) return;
    startTransition(async () => {
      const result = await cancelRouteFlightsAction({ routeId, reason });
      if (!result.ok) {
        toast.error(result.error ?? "No se pudieron cancelar los vuelos del trayecto");
        return;
      }
      toast.success(
        `Se cancelaron ${result.data.cancelled} vuelos del trayecto (${result.data.affectedTickets} pasajeros avisados)`,
      );
      setOpen(false);
      setRouteId("");
      setReason("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>
        Cancelar Todos los Vuelos de un Trayecto
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="flex-row items-start gap-3.5 space-y-0">
          <span className="grid size-[42px] flex-none place-items-center rounded-xl bg-destructive/10 text-destructive">
            <Ban className="size-5" />
          </span>
          <div>
            <DialogTitle>Cancelación masiva por trayecto</DialogTitle>
            <DialogDescription>
              Elegí un trayecto y el motivo. Se cancelarán todos sus vuelos programados futuros.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="cancel-route-id">Trayecto a cancelar *</Label>
          <NativeSelect
            id="cancel-route-id"
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
          >
            <option value="">Seleccioná un trayecto…</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code}: {r.originCode} → {r.destinationCode} ({r.futureFlightCount} vuelos
                programados)
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cancel-route-reason">Motivo operativo de cancelación *</Label>
          <NativeSelect
            id="cancel-route-reason"
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

        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Confirmación explícita</AlertTitle>
          <AlertDescription>
            {selectedRoute ? (
              <>
                Se cancelarán <strong>{selectedRoute.futureFlightCount} vuelos</strong> programados
                futuros del trayecto {selectedRoute.code}. Se registrará el aviso de contingencia
                (RF-10) para todos los compradores con pasajes emitidos.
              </>
            ) : (
              "Se cancelarán todos los vuelos programados futuros del trayecto seleccionado."
            )}
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cerrar</DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={!routeId || !reason || isPending}
            onClick={handleConfirm}
          >
            {isPending ? "Cancelando…" : "Confirmar Cancelación del Trayecto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
