"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { DocumentType } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { savePassengersAction } from "../actions";
import type { BookingPassenger } from "../queries";
import {
  DOCUMENT_TYPE_LABELS,
  passengerSchema,
  passengersFormSchema,
  type PassengersFormValues,
} from "../schema";

type FormInput = z.input<typeof passengersFormSchema>;

const DOCUMENT_TYPES = Object.values(DocumentType);
const DOCUMENT_TYPE_ITEMS = DOCUMENT_TYPES.map((type) => ({
  value: type,
  label: DOCUMENT_TYPE_LABELS[type],
}));

const DOCUMENT_HINTS: Record<DocumentType, { placeholder: string; hint: string }> = {
  DNI: { placeholder: "Ej. 32456789", hint: "7 u 8 dígitos, sin puntos." },
  PASSPORT: { placeholder: "Ej. AAA123456", hint: "De 6 a 9 letras o números." },
};

function toFormPassenger(passenger: BookingPassenger | undefined): FormInput["pasajeros"][number] {
  return {
    nombre: passenger?.firstName ?? "",
    apellido: passenger?.lastName ?? "",
    tipoDocumento: passenger?.documentType ?? "DNI",
    numeroDocumento: passenger?.documentNumber ?? "",
  };
}

type Props = {
  bookingId: string;
  quantity: number;
  /** Pasajeros ya cargados, al volver desde el pago para editarlos. */
  initialPassengers: BookingPassenger[];
};

// US-18/US-19: un formulario por cada pasaje de la reserva. Los errores se
// marcan en el campo exacto y en la tarjeta del pasajero, y no se avanza al
// pago hasta que estén todos completos y con formato válido.
export function PassengersForm({ bookingId, quantity, initialPassengers }: Props) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const form = useForm<FormInput, unknown, PassengersFormValues>({
    resolver: zodResolver(passengersFormSchema),
    mode: "onTouched",
    defaultValues: {
      pasajeros: Array.from({ length: quantity }, (_, i) => toFormPassenger(initialPassengers[i])),
    },
  });

  const passengers = useWatch({ control: form.control, name: "pasajeros" });
  const errors = form.formState.errors.pasajeros;
  const passengersWithErrors = Array.from({ length: quantity }, (_, i) => i).filter(
    (i) => errorCount(errors?.[i]) > 0,
  );
  const busy = form.formState.isSubmitting || isNavigating;

  async function onSubmit(values: PassengersFormValues) {
    const result = await savePassengersAction(bookingId, values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            form.setError(field as FieldPath<FormInput>, { message: messages[0] });
          }
        }
      }
      if (result.error) toast.error(result.error);
      return;
    }

    startTransition(() => {
      router.push(`/compra/pago?${new URLSearchParams({ reserva: result.data.code })}`);
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Datos de los pasajeros</CardTitle>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
          {quantity} {quantity === 1 ? "pasajero" : "pasajeros"}
        </span>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <p className="text-[13px] text-muted-foreground">
            Completá los datos de cada persona que viaja tal como figuran en su documento: cada
            pasaje electrónico sale a su nombre.
          </p>

          {Array.from({ length: quantity }, (_, index) => {
            const passengerErrors = errors?.[index];
            const count = errorCount(passengerErrors);
            const complete = count === 0 && passengerSchema.safeParse(passengers?.[index]).success;
            const documentType = passengers?.[index]?.tipoDocumento ?? "DNI";
            const prefix = `p${index}`;

            return (
              <div
                key={index}
                role="group"
                aria-labelledby={`${prefix}-title`}
                aria-describedby={count > 0 ? `${prefix}-status` : undefined}
                className={cn(
                  "space-y-4 rounded-2xl border border-border p-4",
                  count > 0 && "border-destructive bg-destructive/5",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 id={`${prefix}-title`} className="text-sm font-extrabold">
                    Pasajero {index + 1}
                  </h3>
                  {count > 0 ? (
                    <span
                      id={`${prefix}-status`}
                      className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive"
                    >
                      ✕ {count} {count === 1 ? "dato a corregir" : "datos a corregir"}
                    </span>
                  ) : complete ? (
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
                      ✓ Datos completos
                    </span>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`${prefix}-nombre`}>
                      Nombre <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`${prefix}-nombre`}
                      autoComplete="off"
                      aria-invalid={!!passengerErrors?.nombre}
                      {...form.register(`pasajeros.${index}.nombre`)}
                    />
                    <FieldError message={passengerErrors?.nombre?.message} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`${prefix}-apellido`}>
                      Apellido <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`${prefix}-apellido`}
                      autoComplete="off"
                      aria-invalid={!!passengerErrors?.apellido}
                      {...form.register(`pasajeros.${index}.apellido`)}
                    />
                    <FieldError message={passengerErrors?.apellido?.message} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`${prefix}-tipo`}>
                      Tipo de documento <span className="text-destructive">*</span>
                    </Label>
                    <Controller
                      control={form.control}
                      name={`pasajeros.${index}.tipoDocumento`}
                      render={({ field }) => (
                        <Select
                          items={DOCUMENT_TYPE_ITEMS}
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            // El formato del número depende del tipo: se revalida si ya se tocó.
                            const number = `pasajeros.${index}.numeroDocumento` as const;
                            if (form.getFieldState(number).isTouched) void form.trigger(number);
                          }}
                        >
                          <SelectTrigger
                            id={`${prefix}-tipo`}
                            ref={field.ref}
                            className="w-full"
                            aria-invalid={!!passengerErrors?.tipoDocumento}
                            onBlur={field.onBlur}
                          >
                            <SelectValue placeholder="Seleccioná el tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {DOCUMENT_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {DOCUMENT_TYPE_LABELS[type]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError message={passengerErrors?.tipoDocumento?.message} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`${prefix}-documento`}>
                      Número de documento <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id={`${prefix}-documento`}
                      autoComplete="off"
                      inputMode={documentType === "DNI" ? "numeric" : "text"}
                      placeholder={DOCUMENT_HINTS[documentType].placeholder}
                      aria-invalid={!!passengerErrors?.numeroDocumento}
                      {...form.register(`pasajeros.${index}.numeroDocumento`)}
                    />
                    <FieldError
                      message={passengerErrors?.numeroDocumento?.message}
                      hint={DOCUMENT_HINTS[documentType].hint}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {form.formState.submitCount > 0 && passengersWithErrors.length > 0 && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Hay datos para corregir antes de pagar</AlertTitle>
              <AlertDescription>
                Revisá{" "}
                {passengersWithErrors.map((i) => `Pasajero ${i + 1}`).join(", ")}: los campos
                marcados en rojo tienen datos faltantes o con formato inválido.
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Guardando pasajeros…" : "Continuar al pago"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function errorCount(errors: object | undefined): number {
  return errors ? Object.keys(errors).length : 0;
}

function FieldError({ message, hint }: { message?: string; hint?: string }) {
  if (message) return <p className="text-xs text-destructive">{message}</p>;
  if (hint) return <p className="text-xs text-muted-foreground">{hint}</p>;
  return null;
}
