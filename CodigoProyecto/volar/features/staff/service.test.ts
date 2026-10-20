import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma, type User } from "@/generated/prisma/client";
import { prismaMock } from "@/tests/prisma-mock";

const clerkUsers = {
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
};

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({ users: clerkUsers }),
}));

vi.mock("@clerk/nextjs/errors", () => ({
  isClerkAPIResponseError: (err: unknown) =>
    typeof err === "object" && err !== null && "clerkError" in err,
}));

import { changeStaffRole, createStaffAccount, deactivateStaff, reactivateStaff } from "./service";

/** Error con la forma de ClerkAPIResponseError (lo que usa el servicio). */
function clerkError(code: string, status = 422) {
  return { clerkError: true, status, message: code, errors: [{ code, longMessage: code }] };
}

function makeUser(overrides: Partial<User>): User {
  return {
    id: "USU_2",
    clerkId: "clerk_2",
    email: "cgomez@volar.com",
    firstName: "Carlos",
    lastName: "Gómez",
    documentType: null,
    documentNumber: null,
    phone: null,
    role: "COUNTER_AGENT",
    isActive: true,
    createdById: "USU_ADMIN",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const formData = {
  firstName: "Carlos",
  lastName: "Gómez",
  email: "cgomez@volar.com",
  role: "COUNTER_AGENT" as const,
  password: "Temporal-2026",
};

beforeEach(() => {
  for (const fn of Object.values(clerkUsers)) fn.mockReset();
});

describe("createStaffAccount", () => {
  it("rechaza un email ya registrado localmente sin llamar a Clerk", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeUser({}));

    const result = await createStaffAccount(formData, "USU_ADMIN");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.email).toBeDefined();
    expect(clerkUsers.createUser).not.toHaveBeenCalled();
  });

  it("crea el usuario en Clerk y la fila local con rol y admin creador (trazabilidad)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    clerkUsers.createUser.mockResolvedValue({ id: "clerk_new" });
    prismaMock.user.create.mockResolvedValue(makeUser({ id: "USU_NEW" }));

    const result = await createStaffAccount(formData, "USU_ADMIN");

    expect(result).toEqual({ ok: true, data: { id: "USU_NEW" } });
    expect(clerkUsers.createUser).toHaveBeenCalledWith({
      emailAddress: ["cgomez@volar.com"],
      password: "Temporal-2026",
      firstName: "Carlos",
      lastName: "Gómez",
    });
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: expect.stringMatching(/^USU_/),
        clerkId: "clerk_new",
        email: "cgomez@volar.com",
        role: "COUNTER_AGENT",
        createdById: "USU_ADMIN",
      }),
    });
  });

  it("nunca guarda la contraseña en la base local", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    clerkUsers.createUser.mockResolvedValue({ id: "clerk_new" });
    prismaMock.user.create.mockResolvedValue(makeUser({}));

    await createStaffAccount(formData, "USU_ADMIN");

    const { data } = prismaMock.user.create.mock.calls[0][0];
    expect(JSON.stringify(data)).not.toContain("Temporal-2026");
  });

  it("marca el email si ya existe en Clerk", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    clerkUsers.createUser.mockRejectedValue(clerkError("form_identifier_exists"));

    const result = await createStaffAccount(formData, "USU_ADMIN");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.email).toBeDefined();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("marca la contraseña si Clerk la rechaza por filtrada", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    clerkUsers.createUser.mockRejectedValue(clerkError("form_password_pwned"));

    const result = await createStaffAccount(formData, "USU_ADMIN");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.password).toBeDefined();
  });

  it("revierte el usuario de Clerk si falla la fila local", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    clerkUsers.createUser.mockResolvedValue({ id: "clerk_new" });
    clerkUsers.deleteUser.mockResolvedValue({});
    prismaMock.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.10.0",
      }),
    );

    const result = await createStaffAccount(formData, "USU_ADMIN");

    expect(result.ok).toBe(false);
    expect(clerkUsers.deleteUser).toHaveBeenCalledWith("clerk_new");
  });
});

describe("deactivateStaff", () => {
  it("no permite que un admin se deshabilite a sí mismo", async () => {
    const result = await deactivateStaff("USU_ADMIN", "USU_ADMIN");

    expect(result.ok).toBe(false);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("no opera sobre cuentas de pasajeros", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeUser({ role: "PASSENGER" }));

    const result = await deactivateStaff("USU_2", "USU_ADMIN");

    expect(result.ok).toBe(false);
    expect(clerkUsers.banUser).not.toHaveBeenCalled();
  });

  it("bloquea el login en Clerk y marca isActive: false sin borrar", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeUser({}));

    const result = await deactivateStaff("USU_2", "USU_ADMIN");

    expect(result.ok).toBe(true);
    expect(clerkUsers.banUser).toHaveBeenCalledWith("clerk_2");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "USU_2" },
      data: { isActive: false },
    });
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  it("deshabilita igual si el usuario no existe en Clerk (404)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeUser({}));
    clerkUsers.banUser.mockRejectedValue(clerkError("resource_not_found", 404));

    const result = await deactivateStaff("USU_2", "USU_ADMIN");

    expect(result.ok).toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalled();
  });

  it("no marca la cuenta si Clerk falla por otro motivo", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeUser({}));
    clerkUsers.banUser.mockRejectedValue(clerkError("internal_error", 500));

    await expect(deactivateStaff("USU_2", "USU_ADMIN")).rejects.toBeDefined();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});

describe("reactivateStaff", () => {
  it("desbloquea el login en Clerk y marca isActive: true", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeUser({ isActive: false }));

    const result = await reactivateStaff("USU_2");

    expect(result.ok).toBe(true);
    expect(clerkUsers.unbanUser).toHaveBeenCalledWith("clerk_2");
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "USU_2" },
      data: { isActive: true },
    });
  });

  it("rechaza si la cuenta ya está activa", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeUser({ isActive: true }));

    const result = await reactivateStaff("USU_2");

    expect(result.ok).toBe(false);
    expect(clerkUsers.unbanUser).not.toHaveBeenCalled();
  });
});

describe("changeStaffRole", () => {
  it("no permite que un admin cambie su propio rol", async () => {
    const result = await changeStaffRole("USU_ADMIN", "COUNTER_AGENT", "USU_ADMIN");

    expect(result.ok).toBe(false);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("cambia el rol de una cuenta de personal", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeUser({ role: "COUNTER_AGENT" }));

    const result = await changeStaffRole("USU_2", "ADMIN", "USU_ADMIN");

    expect(result.ok).toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "USU_2" },
      data: { role: "ADMIN" },
    });
  });

  it("no convierte pasajeros en personal", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeUser({ role: "PASSENGER" }));

    const result = await changeStaffRole("USU_2", "ADMIN", "USU_ADMIN");

    expect(result.ok).toBe(false);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
