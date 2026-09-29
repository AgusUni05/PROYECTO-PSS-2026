import { describe, expect, it } from "vitest";
import type { User } from "@/generated/prisma/client";
import { isAdmin } from "./auth";

function makeUser(overrides: Partial<User>): User {
  return {
    id: "USU_1",
    clerkId: "clerk_1",
    email: "admin@volar.com",
    firstName: "Ana",
    lastName: "Admin",
    documentType: null,
    documentNumber: null,
    phone: null,
    role: "PASSENGER",
    isActive: true,
    createdById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// US-30: acceso al panel diferenciado por rol.
describe("isAdmin", () => {
  it("es true para un ADMIN activo", () => {
    expect(isAdmin(makeUser({ role: "ADMIN", isActive: true }))).toBe(true);
  });

  it("es false para un PASSENGER", () => {
    expect(isAdmin(makeUser({ role: "PASSENGER" }))).toBe(false);
  });

  it("es false para un COUNTER_AGENT", () => {
    expect(isAdmin(makeUser({ role: "COUNTER_AGENT" }))).toBe(false);
  });

  it("es false para un ADMIN deshabilitado", () => {
    expect(isAdmin(makeUser({ role: "ADMIN", isActive: false }))).toBe(false);
  });

  it("es false sin usuario (sin sesión)", () => {
    expect(isAdmin(null)).toBe(false);
  });
});
