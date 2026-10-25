"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { DocumentType } from "@/generated/prisma/enums";
import type { SeatClass } from "@/generated/prisma/enums";
import { DOCUMENT_TYPE_LABELS } from "@/features/purchase/schema";
import { formatCurrency } from "@/features/flights/format";
import { createCounterSaleAction } from "../actions";
import { COUNTER_PAYMENT_METHODS, COUNTER_PAYMENT_METHOD_LABELS, counterSaleSchema } from "../schema";

type FormInput = z.input<typeof counterSaleSchema>;

const EMPTY_PASSENGER = { nombre: "", apellido: "", tipoDocumento: "DNI" as const, numeroDocumento: "" };

type Props = {
  flightId: string;
  seatClass: SeatClass;
  fare: string;
  maxAvailable: number;
};

// US-33: venta presencial en un solo paso (cantidad implícita = pasajeros
// cargados, hasta 9; una sola clase; medio de cobro). Al confirmar, redirige
// a la consulta de reservas (US-34) para mostrar el comprobante emitido.
export function CounterSaleForm({ flightId, seatClass, fare, maxAvailable }: Props) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const maxPassengers = Math.min(9, maxAvailable);

  const form = useForm<FormInput, unknown, z.output<typeof counterSaleSchema>>({
    resolver: zodResolver(counterSaleSchema),
    defaultValues: {
      flightId,
      seatClass,
      metodoPago: "CASH",
      contactEmail: "",
      pasajeros: [EMPTY_PASSENGER],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "pasajeros" });
  const passengers = useWatch({ control: form.control, name: "pasajeros" });
  const [serverError, setServerError] = useState<string | null>(null);
  const busy = form.formState.isSubmitting || isNavigating;
  const quantity = fields.length;

  async function onSubmit(values: z.output<typeof counterSaleSchema>) {
    setServerError(null);
    const result = await createCounterSaleAction(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) form.setError(field as FieldPath<FormInput>, { message: messages[0] });
        }
      }
      const message = result.error ?? "No se pudo registrar la venta.";
      setServerError(message);
      toast.error(message);
      return;
    }

    startTransition(() => {
      router.push(`/mostrador/reservas?${new URLSearchParams({ criterio: result.data.code, codigo: result.data.code })}`);
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Registro de Venta Presencial</CardTitle>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
          {quantity} {quantity === 1 ? "pasaje" : "pasajes"} · {formatCurrency(Number(fare) * quantity)}
        </span>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          {fields.map((field, index) => {
            const errors = form.formState.errors.pasajeros?.[index];
            const documentType = passengers?.[index]?.tipoDocumento ?? "DNI";

            return (
              <div key={field.id} className="space-y-3 rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold">
                    Pasajero {index + 1}
                    {index === 0 && " (titular que compra en mostrador)"}
                  </h3>
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                      Quitar
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label htmlFor={`p${index}-nombre`}>Nombre</Label>
                    <Input id={`p${index}-nombre`} {...form.register(`pasajeros.${index}.nombre`)} />
                    {errors?.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`p${index}-apellido`}>Apellido</Label>
                    <Input id={`p${index}-apellido`} {...form.register(`pasajeros.${index}.apellido`)} />
                    {errors?.apellido && <p className="text-xs text-destructive">{errors.apellido.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`p${index}-tipo`}>Tipo de documento</Label>
                    <NativeSelect id={`p${index}-tipo`} {...form.register(`pasajeros.${index}.tipoDocumento`)}>
                      {Object.values(DocumentType).map((type) => (
                        <option key={type} value={type}>
                          {DOCUMENT_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`p${index}-doc`}>
                      {documentType === "DNI" ? "DNI" : "Pasaporte"}
                    </Label>
                    <Input id={`p${index}-doc`} {...form.register(`pasajeros.${index}.numeroDocumento`)} />
                    {errors?.numeroDocumento && (
                      <p className="text-xs text-destructive">{errors.numeroDocumento.message}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            disabled={quantity >= maxPassengers}
            onClick={() => append(EMPTY_PASSENGER)}
          >
            + Agregar pasajero ({quantity}/{maxPassengers})
          </Button>

          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">
              Email del pasajero <span className="text-destructive">*</span>
            </Label>
            <Input id="contactEmail" type="email" required {...form.register("contactEmail")} />
            <p className="text-xs text-muted-foreground">
              Se usa para enviar los comprobantes y, si corresponde, vincular la venta a su cuenta.
            </p>
            {form.formState.errors.contactEmail && (
              <p className="text-xs text-destructive">{form.formState.errors.contactEmail.message}</p>
            )}
          </div>

          <fieldset className="space-y-2">
            <Label>Cobro en Mostrador</Label>
            <div className="flex gap-4">
              {COUNTER_PAYMENT_METHODS.map((method) => (
                <label key={method} className="flex items-center gap-2 text-sm">
                  <input type="radio" value={method} {...form.register("metodoPago")} />
                  {COUNTER_PAYMENT_METHOD_LABELS[method]}
                </label>
              ))}
            </div>
          </fieldset>

          {serverError && (
            <Alert variant="destructive">
              <AlertTitle>No se pudo registrar la venta</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Confirmando cobro…" : "Confirmar Cobro y Emitir Pasajes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
