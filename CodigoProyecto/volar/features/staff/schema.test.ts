import { describe, expect, it } from "vitest";
import { staffFiltersSchema, staffFormSchema, staffRoleSchema } from "./schema";

const valid = {
  firstName: "Carlos",
  lastName: "Gómez",
  email: "cgomez@volar.com",
  role: "COUNTER_AGENT",
  password: "Temporal-2026",
};

describe("staffFormSchema", () => {
  it("acepta un alta válida y normaliza el email (trim + minúsculas)", () => {
    const result = staffFormSchema.safeParse({ ...valid, email: "  CGomez@Volar.com " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("cgomez@volar.com");
  });

  it("acepta el rol Administrador", () => {
    expect(staffFormSchema.safeParse({ ...valid, role: "ADMIN" }).success).toBe(true);
  });

  it("rechaza el rol Pasajero (no es una cuenta de personal)", () => {
    expect(staffFormSchema.safeParse({ ...valid, role: "PASSENGER" }).success).toBe(false);
  });

  it("rechaza un email inválido", () => {
    expect(staffFormSchema.safeParse({ ...valid, email: "no-es-email" }).success).toBe(false);
  });

  it("rechaza una contraseña temporal de menos de 8 caracteres", () => {
    expect(staffFormSchema.safeParse({ ...valid, password: "corta" }).success).toBe(false);
  });

  it("rechaza nombre o apellido vacíos", () => {
    expect(staffFormSchema.safeParse({ ...valid, firstName: "  " }).success).toBe(false);
    expect(staffFormSchema.safeParse({ ...valid, lastName: "" }).success).toBe(false);
  });
});

describe("staffRoleSchema", () => {
  it("solo admite roles de personal", () => {
    expect(staffRoleSchema.safeParse({ role: "ADMIN" }).success).toBe(true);
    expect(staffRoleSchema.safeParse({ role: "PASSENGER" }).success).toBe(false);
  });
});

describe("staffFiltersSchema", () => {
  it("usa valores por defecto ante filtros inválidos", () => {
    expect(staffFiltersSchema.parse({ rol: "PASSENGER", estado: "x", page: "-3" })).toEqual({
      q: "",
      rol: "todos",
      estado: "todos",
      page: 1,
    });
  });
});
