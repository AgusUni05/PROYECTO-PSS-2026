import { z } from "zod";

// US-31: roles que puede tener una cuenta de personal (los pasajeros se registran solos, US-28).
export const STAFF_ROLES = ["ADMIN", "COUNTER_AGENT"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  ADMIN: "Administrador",
  COUNTER_AGENT: "Empleado de Mostrador",
};

const staffRoleField = z.enum(STAFF_ROLES, { error: "Seleccioná un rol" });

// US-31: alta de cuenta de personal (gestion_personal.html). La contraseña
// temporal se envía a Clerk y nunca se guarda en la base local.
export const staffFormSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es obligatorio").max(50, "Máximo 50 caracteres"),
  lastName: z.string().trim().min(1, "El apellido es obligatorio").max(50, "Máximo 50 caracteres"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Máximo 254 caracteres")
    .pipe(z.email("Ingresá un email válido")),
  role: staffRoleField,
  password: z
    .string()
    .min(8, "La contraseña temporal debe tener al menos 8 caracteres")
    .max(72, "Máximo 72 caracteres"),
});

export type StaffFormValues = z.infer<typeof staffFormSchema>;

// US-31: cambio de rol de una cuenta de personal existente.
export const staffRoleSchema = z.object({ role: staffRoleField });

export const STAFF_ROLE_FILTERS = ["todos", ...STAFF_ROLES] as const;
export const STAFF_STATUS_FILTERS = ["activos", "inactivos", "todos"] as const;

export const staffFiltersSchema = z.object({
  q: z.string().trim().max(120).catch(""),
  rol: z.enum(STAFF_ROLE_FILTERS).catch("todos"),
  estado: z.enum(STAFF_STATUS_FILTERS).catch("todos"),
  page: z.coerce.number().int().min(1).catch(1),
});

export type StaffFilters = z.infer<typeof staffFiltersSchema>;
