"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createAirportAction, updateAirportAction } from "../actions";
import { airportFormSchema, type AirportFormValues } from "../schema";

type AirportFormProps = {
  editing?: { id: string; values: AirportFormValues };
};

const EMPTY_VALUES: AirportFormValues = { code: "", name: "", city: "" };

// US-01: alta / modificación de aeropuerto (formulario del wireframe aeropuertos.html).
export function AirportForm({ editing }: AirportFormProps) {
  const router = useRouter();
  const isEditing = !!editing;

  const form = useForm<AirportFormValues>({
    resolver: zodResolver(airportFormSchema),
    defaultValues: editing?.values ?? EMPTY_VALUES,
  });

  async function onSubmit(values: AirportFormValues) {
    const result = isEditing
      ? await updateAirportAction(editing.id, values)
      : await createAirportAction(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            form.setError(field as keyof AirportFormValues, { message: messages[0] });
          }
        }
      }
      if (result.error) toast.error(result.error);
      return;
    }

    toast.success(isEditing ? "Aeropuerto actualizado" : "Aeropuerto creado");
    if (isEditing) {
      router.push("/admin/aeropuertos");
    } else {
      form.reset(EMPTY_VALUES);
    }
  }

  function handleCancel() {
    form.reset(editing?.values ?? EMPTY_VALUES);
    if (isEditing) router.push("/admin/aeropuertos");
  }

  return (
    <Card id="form-aeropuerto">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{isEditing ? "Modificar Aeropuerto" : "Alta de Aeropuerto"}</CardTitle>
        <Badge variant="secondary">{isEditing ? "Modo: Edición" : "Modo: Nuevo Registro"}</Badge>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="code">
              Código Aeropuerto (IATA / ICAO) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="code"
              placeholder="Ej: EZE, COR, MDZ, AEP"
              maxLength={4}
              className="uppercase"
              aria-invalid={!!form.formState.errors.code}
              {...form.register("code")}
            />
            {form.formState.errors.code ? (
              <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Código único de 3 (IATA) o 4 (ICAO) letras.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">
              Nombre Oficial del Aeropuerto <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Ej: Ministro Pistarini / Aeroparque J. Newbery"
              aria-invalid={!!form.formState.errors.name}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="city">
              Ciudad / Localidad <span className="text-destructive">*</span>
            </Label>
            <Input
              id="city"
              placeholder="Ej: Buenos Aires, Córdoba, Mendoza"
              aria-invalid={!!form.formState.errors.city}
              {...form.register("city")}
            />
            {form.formState.errors.city && (
              <p className="text-xs text-destructive">{form.formState.errors.city.message}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Guardando…" : "Guardar Aeropuerto"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => form.reset()}>
              Limpiar Campos
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
