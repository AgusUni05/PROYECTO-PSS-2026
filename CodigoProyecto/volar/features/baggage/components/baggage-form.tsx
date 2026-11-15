"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/features/flights/format";
import { formatCardNumber, formatCvv, formatExpiry } from "@/features/purchase/schema";
import type { CheckinPassenger } from "@/features/checkin/queries";
import { addBaggageAction } from "../actions";
import { BAGGAGE_UNIT_PRICE, MAX_EXTRA_BAGS, baggageTotal } from "../pricing";

type CardField = "numeroTarjeta" | "titular" | "vencimiento" | "cvv";

const FIELDS: { name: CardField; label: string; placeholder: string; mask?: (value: string) => string }[] = [
  { name: "numeroTarjeta", label: "Número de tarjeta", placeholder: "4111 1111 1111 1112", mask: formatCardNumber },
  { name: "titular", label: "Titular", placeholder: "Como figura en la tarjeta" },
  { name: "vencimiento", label: "Vencimiento", placeholder: "MM/AA", mask: formatExpiry },
  { name: "cvv", label: "Código de seguridad", placeholder: "123", mask: formatCvv },
];

export type BaggagePassenger = CheckinPassenger & { flightCode: string };

// US-41: valijas adicionales por pasajero, subtotal en vivo y pago con la
// pasarela simulada (US-20/US-21). No se persiste ningún dato sensible (RNF-08).
export function BaggageForm({ code, passengers }: { code: string; passengers: BaggagePassenger[] }) {
  const router = useRouter();
  const [bags, setBags] = useState<Record<string, number>>({});
  const [values, setValues] = useState<Record<CardField, string>>({
    numeroTarjeta: "",
    titular: "",
    vencimiento: "",
    cvv: "",
  });
  const [errors, setErrors] = useState<Partial<Record<CardField, string>>>({});
  const [isPending, startTransition] = useTransition();

  const totalBags = Object.values(bags).reduce((sum, count) => sum + count, 0);
  const checkinHref = `/compra/checkin?${new URLSearchParams({ reserva: code })}`;

  function change(passenger: BaggagePassenger, delta: number) {
    setBags((current) => {
      const max = MAX_EXTRA_BAGS - passenger.extraBags;
      const next = Math.min(max, Math.max(0, (current[passenger.id] ?? 0) + delta));
      return { ...current, [passenger.id]: next };
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await addBaggageAction({
        reserva: code,
        valijas: Object.entries(bags)
          .filter(([, count]) => count > 0)
          .map(([pasaje, cantidad]) => ({ pasaje, cantidad })),
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
        toast.error(result.error ?? "No se pudo agregar el equipaje.");
        return;
      }
      const count = result.data.bags;
      toast.success(count === 1 ? "Se agregó 1 valija." : `Se agregaron ${count} valijas.`);
      router.push(checkinHref);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <section className="min-w-0 space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-extrabold">Valijas en bodega</h2>
        <p className="text-sm text-muted-foreground">
          {`${formatCurrency(BAGGAGE_UNIT_PRICE)} por valija adicional, hasta ${MAX_EXTRA_BAGS} por pasajero.`}
        </p>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {passengers.map((passenger) => {
            const count = bags[passenger.id] ?? 0;
            const remaining = MAX_EXTRA_BAGS - passenger.extraBags;
            return (
              <li key={passenger.id} className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-3">
                <div className="min-w-0">
                  <span className="block text-sm font-bold break-words">{`${passenger.lastName}, ${passenger.firstName}`}</span>
                  <span className="block text-xs text-muted-foreground">
                    {`Vuelo ${passenger.flightCode}`}
                    {passenger.extraBags > 0 && ` · Ya tiene ${passenger.extraBags} adicionales`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Quitar una valija a ${passenger.firstName}`}
                    onClick={() => change(passenger, -1)}
                    disabled={count === 0}
                  >
                    −
                  </Button>
                  <span className="w-6 text-center text-sm font-bold" aria-live="polite">
                    {count}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Agregar una valija a ${passenger.firstName}`}
                    onClick={() => change(passenger, 1)}
                    disabled={count >= remaining}
                  >
                    +
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-right text-[15px] font-extrabold">
          {`Total: ${formatCurrency(baggageTotal(totalBags))}`}
        </p>
      </section>

      {totalBags > 0 && (
        <section className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-base font-extrabold">Pago del equipaje</h2>
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
          <Button
            type="submit"
            disabled={isPending}
            className="h-auto min-h-11 w-full py-2 whitespace-normal sm:w-fit"
          >
            {isPending ? "Procesando el pago…" : `Pagar ${formatCurrency(baggageTotal(totalBags))}`}
          </Button>
        </section>
      )}
    </form>
  );
}
