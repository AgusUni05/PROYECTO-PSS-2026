"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CalendarSync, Wallet } from "lucide-react";
import { SEAT_CLASS_LABELS } from "@/features/flight-search/class-options";
import { formatCurrency, formatLongDate, formatTime } from "@/features/flights/format";
import type { ContingencyResolutionView } from "@/features/flights/contingency-queries";
import { resolveRefundAction } from "@/features/flights/contingency-actions";

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

export function ContingencyResolution({ view }: { view: NonNullable<ContingencyResolutionView> }) {
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
        <RebookCard />
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
          <p className="text-xs text-muted-foreground">DNI {passenger.documentNumber}</p>
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

function RebookCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarSync className="size-5 text-primary" />
          Reprogramar
        </CardTitle>
        <CardDescription>Elegí otra fecha del mismo trayecto sin cargo.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" disabled>
          Ver alternativas
        </Button>
      </CardContent>
    </Card>
  );
}

function RefundCard({ token, amount }: { token: string; amount: number }) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function handleRefund() {
    startTransition(async () => {
      const result = await resolveRefundAction(token);

      if (!result.ok) {
        setFeedback({ type: "error", message: result.error ?? "No se pudo procesar el reembolso." });
        toast.error(result.error ?? "No se pudo procesar el reembolso.");
        return;
      }

      setFeedback({ type: "success", message: "Reembolso registrado correctamente." });
      toast.success("Reembolso registrado correctamente.");
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
        <Button
          variant="outline"
          className="w-full"
          disabled={isPending}
          onClick={handleRefund}
        >
          {isPending ? "Procesando…" : "Solicitar reembolso"}
        </Button>
      </CardContent>
    </Card>
  );
}
