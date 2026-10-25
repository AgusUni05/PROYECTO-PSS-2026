"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { AlertCircle, CalendarSync, Wallet } from "lucide-react";
import type { SeatClass } from "@/generated/prisma/enums";
import { SEAT_CLASS_LABELS } from "@/features/flight-search/class-options";
import { formatCurrency, formatLongDate, formatTime } from "@/features/flights/format";
import type {
  ContingencyResolutionView,
  RebookingAlternative,
} from "@/features/flights/contingency-queries";
import { resolveRefundAction } from "@/features/flights/contingency-actions";
import {
  buildRebookingConfirmation,
  buildRefundConfirmation,
  submitRebooking,
} from "./contingency-resolution.utils";

export function ContingencyNotFound() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight">Enlace no válido</h1>
      <p className="mt-3 text-muted-foreground">
        El enlace con el que llegaste está incompleto, fue modificado o ya expiró.
      </p>
    </div>
  );
}

export function ContingencyResolved({
  resolution,
  resolvedAt,
}: {
  resolution: "REFUND" | "REBOOK";
  resolvedAt: Date;
}) {
  const isRefund = resolution === "REFUND";
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight">
        {isRefund ? "Reembolso confirmado" : "Reprogramación confirmada"}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {isRefund
          ? "El reembolso de tu pasaje fue registrado."
          : "Tu pasaje fue reprogramado en otro vuelo."}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Resuelto el {formatLongDate(resolvedAt)} a las {formatTime(resolvedAt)} hs.
      </p>
    </div>
  );
}

export function ContingencyResolution({
  view,
  alternatives = [],
}: {
  view: NonNullable<ContingencyResolutionView>;
  alternatives?: RebookingAlternative[];
}) {
  if (view.status === "REFUND" || view.status === "REBOOK") {
    return <ContingencyResolved resolution={view.resolution} resolvedAt={view.resolvedAt} />;
  }

  const isCancellation = view.changeType === "CANCELLATION";

  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {isCancellation ? "Tu vuelo fue cancelado" : "Cambio de horario"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isCancellation
            ? "Elegí cómo querés continuar con tu pasaje."
            : "El horario de tu vuelo cambió. Elegí cómo querés continuar."}
        </p>
      </div>

      <SummaryCard view={view} />

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <RebookCard
          token={view.token}
          alternatives={alternatives}
          originCode={view.flight.origin.code}
          destinationCode={view.flight.destination.code}
          seatClass={view.ticket.seatClass}
        />
        <RefundCard token={view.token} amount={view.ticket.unitPrice} />
      </div>

      <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        Una vez que elijas una opción no podrás cambiarla desde este enlace.
      </p>
    </div>
  );
}

function SummaryCard({ view }: { view: Extract<ContingencyResolutionView, { status: "PENDING" }> }) {
  const { passenger, ticket, flight, previousDepartureAt, previousArrivalAt, newDepartureAt, newArrivalAt } = view;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold">
            {passenger.lastName}, {passenger.firstName}
          </h2>
          <p className="text-xs text-muted-foreground">
            {passenger.documentType === "DNI" ? "DNI" : "Pasaporte"} {passenger.documentNumber}
          </p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs">{flight.code}</span>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryItem label="Trayecto">
          {flight.origin.city} ({flight.origin.code}) → {flight.destination.city} ({flight.destination.code})
        </SummaryItem>
        <SummaryItem label="Fecha">{formatLongDate(flight.date)}</SummaryItem>
        <SummaryItem label="Horario anterior">
          {formatTime(previousDepartureAt)} → {formatTime(previousArrivalAt)}
        </SummaryItem>
        {newDepartureAt && newArrivalAt && (
          <SummaryItem label="Nuevo horario">
            {formatTime(newDepartureAt)} → {formatTime(newArrivalAt)}
          </SummaryItem>
        )}
        <SummaryItem label="Clase">{SEAT_CLASS_LABELS[ticket.seatClass]}</SummaryItem>
        <SummaryItem label="Importe del pasaje">{formatCurrency(ticket.unitPrice)}</SummaryItem>
      </dl>
    </Card>
  );
}

function SummaryItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}

function alternativeLabel(alternative: RebookingAlternative): string {
  const seats =
    alternative.availableSeats === 1
      ? "1 cupo libre"
      : `${alternative.availableSeats} cupos libres`;

  return `${alternative.code} - ${formatLongDate(alternative.date)} a las ${formatTime(alternative.departureAt)} hs (${seats})`;
}

function RebookCard({
  token,
  alternatives,
  originCode,
  destinationCode,
  seatClass,
}: {
  token: string;
  alternatives: RebookingAlternative[];
  originCode: string;
  destinationCode: string;
  seatClass: SeatClass;
}) {
  const router = useRouter();
  const [selectedFlightId, setSelectedFlightId] = useState(alternatives[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [resolved, setResolved] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );
  const selectedAlternative =
    alternatives.find((alternative) => alternative.id === selectedFlightId) ?? alternatives[0];
  const confirmation = buildRebookingConfirmation(selectedAlternative?.code ?? "seleccionado");

  function handleRebook() {
    if (!selectedFlightId) return;
    setConfirmOpen(false);

    startTransition(async () => {
      const result = await submitRebooking(token, selectedFlightId);

      if (!result.ok) {
        const message = result.error ?? "No se pudo procesar la reprogramación.";
        setFeedback({ type: "error", message });
        toast.error(message);
        return;
      }

      const message = `Reprogramación confirmada: ${result.data.flightCode}, asiento ${result.data.seat}.`;
      setResolved(true);
      setFeedback({ type: "success", message });
      toast.success(message);
      router.push("/");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarSync className="size-5 text-primary" />
          Reprogramar
        </CardTitle>
        <CardDescription>
          Sin costo adicional: elegí un vuelo futuro de la misma ruta ({originCode} →{" "}
          {destinationCode}) conservando tu categoría {SEAT_CLASS_LABELS[seatClass]}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alternatives.length === 0 ? (
          <p className="mb-4 text-sm text-muted-foreground">
            No hay vuelos alternativos disponibles para este trayecto.
          </p>
        ) : (
          <div className="mb-4 space-y-1.5">
            <Label htmlFor="vuelo-reprogramado">Elegir vuelo alternativo</Label>
            <NativeSelect
              id="vuelo-reprogramado"
              value={selectedFlightId}
              disabled={isPending || resolved}
              onChange={(event) => setSelectedFlightId(event.target.value)}
            >
              {alternatives.map((alternative) => (
                <option key={alternative.id} value={alternative.id}>
                  {alternativeLabel(alternative)}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}

        {feedback?.type === "error" && (
          <p className="mb-3 text-center text-xs text-destructive">{feedback.message}</p>
        )}
        {feedback?.type === "success" && (
          <p className="mb-3 text-center text-xs text-green-600">{feedback.message}</p>
        )}

        <ConfirmActionDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          triggerLabel={
            resolved
              ? "Reprogramación registrada"
              : isPending
                ? "Procesando…"
                : "Confirmar reprogramación gratuita"
          }
          triggerVariant="default"
          triggerClassName="w-full"
          triggerDisabled={
            isPending || resolved || alternatives.length === 0 || !selectedFlightId
          }
          title={confirmation.title}
          description={confirmation.description}
          confirmLabel={confirmation.confirmLabel}
          cancelLabel={confirmation.cancelLabel}
          pendingLabel={confirmation.confirmLabel}
          isPending={isPending}
          onConfirm={handleRebook}
        />
      </CardContent>
    </Card>
  );
}

function RefundCard({ token, amount }: { token: string; amount: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [resolved, setResolved] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const confirmation = buildRefundConfirmation(amount);

  function handleRefund() {
    setConfirmOpen(false);
    startTransition(async () => {
      const result = await resolveRefundAction(token);

      if (!result.ok) {
        setFeedback({ type: "error", message: result.error ?? "No se pudo procesar el reembolso." });
        toast.error(result.error ?? "No se pudo procesar el reembolso.");
        return;
      }

      setResolved(true);
      setFeedback({ type: "success", message: "Reembolso registrado correctamente." });
      toast.success("Reembolso registrado correctamente.");
      router.push("/");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="size-5 text-primary" />
          Reembolso
        </CardTitle>
        <CardDescription>Recibí el 100% del importe del pasaje.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-center">
          <span className="text-[28px] font-extrabold tracking-[-0.03em]">{formatCurrency(amount)}</span>
          <p className="text-xs text-muted-foreground">Total a reembolsar</p>
        </div>
        {feedback?.type === "error" && (
          <p className="mb-3 text-center text-xs text-destructive">{feedback.message}</p>
        )}
        {feedback?.type === "success" && (
          <p className="mb-3 text-center text-xs text-green-600">{feedback.message}</p>
        )}
        <ConfirmActionDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          triggerLabel={
            resolved ? "Reembolso registrado" : isPending ? "Procesando…" : "Solicitar reembolso"
          }
          triggerVariant="outline"
          triggerClassName="w-full"
          triggerDisabled={isPending || resolved}
          title={confirmation.title}
          description={confirmation.description}
          confirmLabel={confirmation.confirmLabel}
          cancelLabel={confirmation.cancelLabel}
          pendingLabel={confirmation.confirmLabel}
          isPending={isPending}
          onConfirm={handleRefund}
        />
      </CardContent>
    </Card>
  );
}
