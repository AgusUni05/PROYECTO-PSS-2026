import { describe, expect, it, vi, beforeEach } from "vitest";
import type { User } from "@/generated/prisma/client";
import { prismaMock } from "@/tests/prisma-mock";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  forbidden: vi.fn(() => {
    throw new Error("forbidden");
  }),
}));

import { currentUser, auth } from "@clerk/nextjs/server";
import { isAdmin, syncClerkUser, requireCurrentUser, requirePassenger } from "./auth";

beforeEach(() => {
  vi.mocked(auth).mockReset();
  vi.mocked(currentUser).mockReset();
});

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

// US-28: registro automático del pasajero al primer login (sincronización con Clerk).
describe("syncClerkUser", () => {
  it("devuelve el usuario existente sin llamar a Clerk ni crear uno nuevo", async () => {
    const existing = makeUser({ clerkId: "clerk_1" });
    prismaMock.user.findUnique.mockResolvedValue(existing);

    const result = await syncClerkUser("clerk_1");

    expect(result).toEqual(existing);
    expect(currentUser).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("crea el usuario con id USU_ cuando no existe y Clerk tiene email primario", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    vi.mocked(currentUser).mockResolvedValue({
      firstName: "Juana",
      lastName: "Pasajera",
      primaryEmailAddressId: "email_1",
      emailAddresses: [{ id: "email_1", emailAddress: "juana@example.com" }],
    } as never);
    const created = makeUser({ clerkId: "clerk_2" });
    prismaMock.user.create.mockResolvedValue(created);

    const result = await syncClerkUser("clerk_2");

    expect(result).toEqual(created);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: expect.stringMatching(/^USU_/),
        clerkId: "clerk_2",
        email: "juana@example.com",
        firstName: "Juana",
        lastName: "Pasajera",
      }),
    });
  });

  it("devuelve null cuando no existe localmente y Clerk no devuelve el usuario", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    vi.mocked(currentUser).mockResolvedValue(null);

    const result = await syncClerkUser("clerk_3");

    expect(result).toBeNull();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("usa el primer email disponible si no hay primaryEmailAddressId coincidente", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    vi.mocked(currentUser).mockResolvedValue({
      firstName: "Juana",
      lastName: "Pasajera",
      primaryEmailAddressId: "no-matchea",
      emailAddresses: [{ id: "email_1", emailAddress: "primer-email@example.com" }],
    } as never);
    prismaMock.user.create.mockResolvedValue(makeUser({}));

    await syncClerkUser("clerk_4");

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: "primer-email@example.com" }),
    });
  });

  it("devuelve null sin crear cuando Clerk no tiene ningún email", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    vi.mocked(currentUser).mockResolvedValue({
      firstName: "Juana",
      lastName: "Pasajera",
      primaryEmailAddressId: null,
      emailAddresses: [],
    } as never);

    const result = await syncClerkUser("clerk_5");

    expect(result).toBeNull();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});

// Guardias reutilizables para vistas que requieren sesión (US-26 / US-28).
describe("requireCurrentUser", () => {
  it("redirige a sign-in cuando no hay sesión", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);

    await expect(requireCurrentUser()).rejects.toThrow("redirect:/sign-in");
  });

  it("sincroniza y devuelve el usuario cuando hay sesión", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as never);
    const existing = makeUser({ clerkId: "clerk_1" });
    prismaMock.user.findUnique.mockResolvedValue(existing);

    const result = await requireCurrentUser();

    expect(result).toEqual(existing);
  });
});

describe("requirePassenger", () => {
  it("redirige a sign-in cuando no hay sesión", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);

    await expect(requirePassenger()).rejects.toThrow("redirect:/sign-in");
  });

  it("devuelve 403 cuando el usuario no es pasajero", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as never);
    prismaMock.user.findUnique.mockResolvedValue(makeUser({ role: "ADMIN" }));

    await expect(requirePassenger()).rejects.toThrow("forbidden");
  });

  it("devuelve 403 cuando la cuenta del pasajero está deshabilitada", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as never);
    prismaMock.user.findUnique.mockResolvedValue(
      makeUser({ role: "PASSENGER", isActive: false }),
    );

    await expect(requirePassenger()).rejects.toThrow("forbidden");
  });

  it("devuelve el usuario cuando es pasajero activo", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk_1" } as never);
    const passenger = makeUser({ role: "PASSENGER", isActive: true });
    prismaMock.user.findUnique.mockResolvedValue(passenger);

    const result = await requirePassenger();

    expect(result).toEqual(passenger);
  });
});
