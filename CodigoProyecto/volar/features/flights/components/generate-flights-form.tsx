"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActiveAirplaneOption } from "@/features/airplanes/queries";
import type { ActiveRouteOption } from "@/features/routes/queries";
import { generateFlightsAction } from "../actions";
import { generateFlightsFormSchema, type GenerateFlightsFormValues } from "../schema";
import {
  AirplaneCapacitySection,
  FaresSection,
  RoutePeriodSection,
} from "./generate-flights-form-sections";

type Props = {
  routes: ActiveRouteOption[];
  airplanes: ActiveAirplaneOption[];
};

const EMPTY_VALUES: GenerateFlightsFormValues = {
  routeId: "",
  airplaneId: "",
  startDate: "",
  endDate: "",
  economyCapacity: 0,
  firstClassCapacity: 0,
  // Sin valor por defecto: el campo arranca vacío y muestra el placeholder,
  // así nunca parece "ya completado" con una tarifa inválida (0).
  economyFare: undefined as unknown as number,
  firstClassFare: undefined as unknown as number,
};

// US-04/US-07: generador masivo de vuelos reales (formulario del wireframe vuelos_admin.html).
export function GenerateFlightsForm({ routes, airplanes }: Props) {
  const form = useForm<GenerateFlightsFormValues>({
    resolver: zodResolver(generateFlightsFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  async function onSubmit(values: GenerateFlightsFormValues) {
    const result = await generateFlightsAction(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            form.setError(field as keyof GenerateFlightsFormValues, { message: messages[0] });
          }
        }
      }
      if (result.error) toast.error(result.error);
      return;
    }

    toast.success(`Se generaron ${result.data.count} vuelo(s) reales.`);
    form.reset(EMPTY_VALUES);
  }

  return (
    <Card id="form-generador">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Programar Vuelos desde Trayecto y Período</CardTitle>
        <Badge variant="secondary">Generador Masivo</Badge>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <RoutePeriodSection form={form} routes={routes} />
          <AirplaneCapacitySection form={form} airplanes={airplanes} />
          <FaresSection form={form} />

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => form.reset(EMPTY_VALUES)}>
              Restablecer Formulario
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Generando…" : "Generar y Publicar Vuelos Reales"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
