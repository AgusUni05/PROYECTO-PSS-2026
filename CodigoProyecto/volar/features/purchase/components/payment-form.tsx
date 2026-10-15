"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/features/flights/format";
import { processPaymentAction } from "../actions";
import {
  INSTALLMENT_PLANS,
  PAYMENT_METHODS,
  formatCardNumber,
  formatCvv,
  formatExpiry,
  installmentAmount,
  paymentFormSchema,
  type InstallmentPlan,
  type PaymentFormValues,
  type PaymentMethod,
} from "../schema";
import type { PaymentOutcome } from "../service";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CREDIT: "Tarjeta de Crédito",
  DEBIT: "Tarjeta de Débito",
};

const EMPTY_VALUES: PaymentFormValues = {
  medioPago: "CREDIT",
  numeroTarjeta: "",
  titular: "",
  vencimiento: "",
  cvv: "",
  cuotas: 1,
};

function installmentLabel(plan: InstallmentPlan, total: number): string {
  if (plan === 1) return `1 pago de ${formatCurrency(total)} (Sin recargo)`;
  return `${plan} cuotas fijas de ${formatCurrency(installmentAmount(total, plan))}`;
}

type PaymentFormProps = {
  bookingCode: string;
  total: number;
};

// US-20/US-21: formulario de pago con la pasarela simulada (pago_comprobantes.html).
export function PaymentForm({ bookingCode, total }: PaymentFormProps) {
  const [outcome, setOutcome] = useState<PaymentOutcome | null>(null);
  const form = useForm<z.input<typeof paymentFormSchema>, unknown, PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const cuotas = useWatch({ control: form.control, name: "cuotas" }) as InstallmentPlan;
  const planItems = INSTALLMENT_PLANS.map((plan) => ({
    value: String(plan),
    label: installmentLabel(plan, total),
  }));

  async function onSubmit(values: PaymentFormValues) {
    const result = await processPaymentAction(bookingCode, values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            form.setError(field as keyof PaymentFormValues, { message: messages[0] });
          }
        }
      }
      if (result.error) toast.error(result.error);
      return;
    }

    setOutcome(result.data);
  }

  if (outcome) return <PaymentResult outcome={outcome} />;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Formulario de Pago con Tarjeta</CardTitle>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
          US-20 / US-21
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTitle>Seguridad de datos sensibles (RNF-08)</AlertTitle>
          <AlertDescription>
            El número de tarjeta y el código de seguridad se envían a la pasarela bancaria. El
            sistema no persiste datos bancarios sensibles en su base de datos.
          </AlertDescription>
        </Alert>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label>
              Seleccionar Medio de Pago <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={form.control}
              name="medioPago"
              render={({ field }) => (
                <div className="flex flex-wrap gap-3">
                  {PAYMENT_METHODS.map((method) => {
                    const selected = field.value === method;
                    return (
                      <label
                        key={method}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                          selected && "border-primary bg-primary font-semibold text-primary-foreground",
                        )}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name={field.name}
                          value={method}
                          checked={selected}
                          onChange={() => field.onChange(method)}
                        />
                        {METHOD_LABELS[method]}
                      </label>
                    );
                  })}
                </div>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="numeroTarjeta">
              Número de Tarjeta <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={form.control}
              name="numeroTarjeta"
              render={({ field }) => (
                <Input
                  id="numeroTarjeta"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="•••• •••• •••• 4242"
                  aria-invalid={!!form.formState.errors.numeroTarjeta}
                  {...field}
                  value={formatCardNumber(field.value)}
                  onChange={(event) => field.onChange(formatCardNumber(event.target.value))}
                />
              )}
            />
            {form.formState.errors.numeroTarjeta ? (
              <p className="text-xs text-destructive">{form.formState.errors.numeroTarjeta.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">16 dígitos sin espacios.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="titular">
              Nombre y Apellido del Titular <span className="text-destructive">*</span>
            </Label>
            <Input
              id="titular"
              autoComplete="cc-name"
              placeholder="Tal como figura en el plástico"
              aria-invalid={!!form.formState.errors.titular}
              {...form.register("titular")}
            />
            {form.formState.errors.titular && (
              <p className="text-xs text-destructive">{form.formState.errors.titular.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vencimiento">
                Vencimiento (MM/AA) <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={form.control}
                name="vencimiento"
                render={({ field }) => (
                  <Input
                    id="vencimiento"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/AA"
                    maxLength={5}
                    aria-invalid={!!form.formState.errors.vencimiento}
                    {...field}
                    value={formatExpiry(field.value)}
                    onChange={(event) => field.onChange(formatExpiry(event.target.value))}
                  />
                )}
              />
              {form.formState.errors.vencimiento && (
                <p className="text-xs text-destructive">{form.formState.errors.vencimiento.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cvv">
                Código de Seguridad (CVV) <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={form.control}
                name="cvv"
                render={({ field }) => (
                  <Input
                    id="cvv"
                    type="password"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="•••"
                    maxLength={4}
                    aria-invalid={!!form.formState.errors.cvv}
                    {...field}
                    value={formatCvv(field.value)}
                    onChange={(event) => field.onChange(formatCvv(event.target.value))}
                  />
                )}
              />
              {form.formState.errors.cvv ? (
                <p className="text-xs text-destructive">{form.formState.errors.cvv.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">3 dígitos al dorso.</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cuotas">Planes de Financiación</Label>
            <Controller
              control={form.control}
              name="cuotas"
              render={({ field }) => (
                <Select
                  items={planItems}
                  value={String(field.value)}
                  onValueChange={(value) => field.onChange(Number(value))}
                >
                  <SelectTrigger id="cuotas" className="w-full">
                    <SelectValue placeholder="Seleccioná el plan de cuotas" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTALLMENT_PLANS.map((plan) => (
                      <SelectItem key={plan} value={String(plan)}>
                        {installmentLabel(plan, total)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.cuotas && (
              <p className="text-xs text-destructive">{form.formState.errors.cuotas.message}</p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? "Procesando el pago…"
              : cuotas === 1
                ? `Pagar y Confirmar Compra (${formatCurrency(total)})`
                : `Pagar en ${cuotas} cuotas de ${formatCurrency(installmentAmount(total, cuotas))}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PaymentResult({ outcome }: { outcome: PaymentOutcome }) {
  if (outcome.status === "APPROVED") return <ApprovedResult outcome={outcome} />;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Pago rechazado</CardTitle>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
          Sin procesar
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Transacción rechazada (US-21)</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Motivo: {outcome.rejectionReason}</p>
            <p>La compra no se procesó y se liberó el cupo reservado de inmediato.</p>
            <Link
              href="/vuelos"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Buscar otro vuelo
            </Link>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// US-23/US-24: al aprobar, los comprobantes ya están emitidos y enviados, así
// que la compra pasa a la pantalla de comprobantes.
function ApprovedResult({ outcome }: { outcome: PaymentOutcome }) {
  const router = useRouter();
  const href = `/compra/comprobantes?${new URLSearchParams({ reserva: outcome.bookingCode })}`;

  useEffect(() => {
    const timer = setTimeout(() => router.replace(href), 900);
    return () => clearTimeout(timer);
  }, [router, href]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Compra confirmada</CardTitle>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
          Pago aprobado
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTitle>Transacción aprobada (US-21)</AlertTitle>
          <AlertDescription className="space-y-1">
            <p>
              ID de transacción: <b>{outcome.transactionId}</b>
            </p>
            <p>
              La reserva <b>{outcome.bookingCode}</b> quedó confirmada, el cupo retenido pasó a
              vendido y se emitieron los e-tickets y la factura (US-23/US-24).
            </p>
            <p>Abriendo tus comprobantes…</p>
          </AlertDescription>
        </Alert>
        <Link href={href} className={buttonVariants()}>
          Ver comprobantes
        </Link>
      </CardContent>
    </Card>
  );
}
