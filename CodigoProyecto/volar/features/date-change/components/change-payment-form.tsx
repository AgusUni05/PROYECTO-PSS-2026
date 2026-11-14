"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPesos } from "@/features/cancellation/format";
import { formatCardNumber, formatCvv, formatExpiry } from "@/features/purchase/schema";
import { changeBookingAction } from "../actions";
import type { ChangeQuote } from "../quote";

type CardField = "numeroTarjeta" | "titular" | "vencimiento" | "cvv";

const FIELDS: { name: CardField; label: string; placeholder: string; mask?: (value: string) => string }[] = [
  { name: "numeroTarjeta", label: "Número de tarjeta", placeholder: "4111 1111 1111 1112", mask: formatCardNumber },
  { name: "titular", label: "Titular", placeholder: "Como figura en la tarjeta" },
  { name: "vencimiento", label: "Vencimiento", placeholder: "MM/AA", mask: formatExpiry },
  { name: "cvv", label: "Código de seguridad", placeholder: "123", mask: formatCvv },
];

// US-39: pago del adicional del cambio con la pasarela simulada (US-20/US-21).
// No se persiste ningún dato sensible de la tarjeta (RNF-08).
export function ChangePaymentForm({
  code,
  flightId,
  quote,
}: {
  code: string;
  flightId: string;
  quote: ChangeQuote;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<CardField, string>>({
    numeroTarjeta: "",
    titular: "",
    vencimiento: "",
    cvv: "",
  });
  const [errors, setErrors] = useState<Partial<Record<CardField, string>>>({});
  const [accepted, setAccepted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await changeBookingAction({
        reserva: code,
        vuelo: flightId,
        aceptacion: accepted as true,
        medioPago: "CREDIT",
        cuotas: 1,
        ...values,
      });
      if (!result.ok) {
        const fieldErrors = result.fieldErrors ?? {};
        setErrors(
          Object.fromEntries(FIELDS.map(({ name }) => [name, fieldErrors[name]?.[0]])) as Partial<
            Record<CardField, string>
          >,
        );
        toast.error(result.error ?? "No se pudo cambiar la reserva.");
        return;
      }
      toast.success(`Cambio confirmado. Tus pasajes ahora son del vuelo ${result.data.flightCode}.`);
      router.push("/cuenta");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <h2 className="text-base font-extrabold">Pago del adicional</h2>
      {FIELDS.map(({ name, label, placeholder, mask }) => (
        <div key={name} className="grid gap-1.5">
          <Label htmlFor={name}>{label}</Label>
          <Input
            id={name}
            value={values[name]}
            placeholder={placeholder}
            inputMode={name === "titular" ? "text" : "numeric"}
            autoComplete="off"
            aria-invalid={errors[name] ? true : undefined}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [name]: mask ? mask(event.target.value) : event.target.value,
              }))
            }
          />
          {errors[name] && <p className="text-xs text-destructive">{errors[name]}</p>}
        </div>
      ))}

      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
        />
        <span>
          Acepto los términos de la política de penalidades para cambios voluntarios. Se liberan los
          asientos del vuelo original y se emiten pasajes nuevos.
        </span>
      </label>

      <Button
        type="submit"
        disabled={isPending || !accepted}
        className="h-auto min-h-11 w-full py-2 whitespace-normal sm:w-fit"
      >
        {isPending ? "Procesando el pago…" : `Pagar ${formatPesos(quote.total)} y emitir nuevos pasajes`}
      </Button>
    </form>
  );
}
