"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createAirplaneAction, updateAirplaneAction } from "../actions";
import { airplaneFormSchema, type AirplaneFormValues } from "../schema";

type AirplaneFormProps = {
  editing?: { id: string; values: AirplaneFormValues };
};

const EMPTY_VALUES: AirplaneFormValues = {
  identifier: "",
  model: "",
  economySeats: 0,
  firstClassSeats: 0,
};

// US-02: alta / modificación de avión (formulario del wireframe aviones.html).
export function AirplaneForm({ editing }: AirplaneFormProps) {
  const router = useRouter();
  const isEditing = !!editing;

  const form = useForm<AirplaneFormValues>({
    resolver: zodResolver(airplaneFormSchema),
    defaultValues: editing?.values ?? EMPTY_VALUES,
  });

  const economySeats = useWatch({ control: form.control, name: "economySeats" }) || 0;
  const firstClassSeats = useWatch({ control: form.control, name: "firstClassSeats" }) || 0;

  async function onSubmit(values: AirplaneFormValues) {
    const result = isEditing
      ? await updateAirplaneAction(editing.id, values)
      : await createAirplaneAction(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            form.setError(field as keyof AirplaneFormValues, { message: messages[0] });
          }
        }
      }
      if (result.error) toast.error(result.error);
      return;
    }

    toast.success(isEditing ? "Avión actualizado" : "Avión creado");
    if (isEditing) {
      router.push("/admin/aviones");
    } else {
      form.reset(EMPTY_VALUES);
    }
  }

  function handleCancel() {
    form.reset(editing?.values ?? EMPTY_VALUES);
    if (isEditing) router.push("/admin/aviones");
  }

  return (
    <Card id="form-avion">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{isEditing ? "Editar Capacidad de Avión" : "Registro de Avión"}</CardTitle>
        <Badge variant={isEditing ? "default" : "secondary"}>
          {isEditing ? "Edición" : "Alta de aeronave"}
        </Badge>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="identifier">
              Identificador / Matrícula <span className="text-destructive">*</span>
            </Label>
            <Input
              id="identifier"
              placeholder="Ej: LV-ARG01, BOEING-737-A"
              className="uppercase"
              aria-invalid={!!form.formState.errors.identifier}
              {...form.register("identifier")}
            />
            {form.formState.errors.identifier ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.identifier.message}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Identificador único para el avión en la flota.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="model">
              Modelo de Aeronave <span className="text-destructive">*</span>
            </Label>
            <Input
              id="model"
              placeholder="Ej: Boeing 737-800, Airbus A320, Embraer 190"
              aria-invalid={!!form.formState.errors.model}
              {...form.register("model")}
            />
            {form.formState.errors.model && (
              <p className="text-xs text-destructive">{form.formState.errors.model.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="economySeats">
                Asientos Economy <span className="text-destructive">*</span>
              </Label>
              <Input
                id="economySeats"
                type="number"
                min={0}
                max={999}
                aria-invalid={!!form.formState.errors.economySeats}
                {...form.register("economySeats", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="firstClassSeats">
                Asientos Primera Clase <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstClassSeats"
                type="number"
                min={0}
                max={999}
                aria-invalid={!!form.formState.errors.firstClassSeats}
                {...form.register("firstClassSeats", { valueAsNumber: true })}
              />
            </div>
          </div>
          {form.formState.errors.economySeats && (
            <p className="text-xs text-destructive">
              {form.formState.errors.economySeats.message}
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Capacidad Total Estimada</Label>
            <Input
              value={`${economySeats + firstClassSeats} asientos totales`}
              readOnly
              disabled
              className="bg-muted text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Cálculo automático: Asientos Economy + Primera Clase.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Guardando…" : "Guardar Avión"}
            </Button>
            <Button type="button" variant="soft" onClick={() => form.reset()}>
              Limpiar
            </Button>
            <Button type="button" variant="ghost" onClick={handleCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
