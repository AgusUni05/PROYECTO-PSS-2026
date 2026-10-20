"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createStaffAction } from "../actions";
import { STAFF_ROLE_LABELS, STAFF_ROLES, staffFormSchema, type StaffFormValues } from "../schema";

const EMPTY_VALUES: StaffFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  role: "COUNTER_AGENT",
  password: "",
};

// US-31: alta de cuenta de personal (formulario del wireframe gestion_personal.html).
export function StaffForm() {
  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: EMPTY_VALUES,
  });
  const { errors } = form.formState;

  async function onSubmit(values: StaffFormValues) {
    const result = await createStaffAction(values);

    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            form.setError(field as keyof StaffFormValues, { message: messages[0] });
          }
        }
      }
      if (result.error) toast.error(result.error);
      return;
    }

    toast.success("Cuenta de personal creada");
    form.reset(EMPTY_VALUES);
  }

  return (
    <Card id="form-personal">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Alta de Usuario del Personal</CardTitle>
        <Badge variant="secondary">Nuevo operador</Badge>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                aria-invalid={!!errors.firstName}
                {...form.register("firstName")}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">
                Apellido <span className="text-destructive">*</span>
              </Label>
              <Input id="lastName" aria-invalid={!!errors.lastName} {...form.register("lastName")} />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="off"
              placeholder="nombre@volar.com"
              aria-invalid={!!errors.email}
              {...form.register("email")}
            />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Con este email inicia sesión en VolAR.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role">
              Rol en el Sistema <span className="text-destructive">*</span>
            </Label>
            <NativeSelect id="role" aria-invalid={!!errors.role} {...form.register("role")}>
              {STAFF_ROLES.map((role) => (
                <option key={role} value={role}>
                  {STAFF_ROLE_LABELS[role]}
                </option>
              ))}
            </NativeSelect>
            {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">
              Contraseña Temporal <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...form.register("password")}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres. Comunicásela al empleado: podrá cambiarla desde Mi cuenta.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creando…" : "Crear Cuenta de Personal"}
            </Button>
            <Button type="button" variant="soft" onClick={() => form.reset(EMPTY_VALUES)}>
              Limpiar Campos
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
