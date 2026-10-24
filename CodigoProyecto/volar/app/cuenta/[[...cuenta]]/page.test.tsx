import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { User } from "@/generated/prisma/client";

vi.mock("@/lib/auth", () => ({
  requireCurrentUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  forbidden: vi.fn(() => {
    throw new Error("forbidden");
  }),
}));

vi.mock("@/features/purchase/history", () => ({
  getPurchaseHistoryForUser: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  UserProfile: ({ routing }: { routing?: string }) => (
    <div>{routing === "hash" ? "Perfil Clerk hash" : "Perfil Clerk"}</div>
  ),
}));

vi.mock("@/components/site-header", () => ({
  SiteHeader: () => <header>VolAR</header>,
}));

import { requireCurrentUser } from "@/lib/auth";
import { forbidden } from "next/navigation";
import { getPurchaseHistoryForUser } from "@/features/purchase/history";
import CuentaPage from "./page";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "USU_1",
    clerkId: "clerk_1",
    email: "pasajero@volar.com",
    firstName: "Juana",
    lastName: "Pasajera",
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

// US-35: /cuenta muestra el historial del pasajero y conserva el perfil de Clerk.
describe("CuentaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no consulta el historial cuando no hay sesión", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValue(new Error("redirect:/sign-in"));

    await expect(CuentaPage({ params: Promise.resolve({}) })).rejects.toThrow(
      "redirect:/sign-in",
    );
    expect(getPurchaseHistoryForUser).not.toHaveBeenCalled();
  });

  it("muestra las compras del pasajero autenticado usando el id de sesión", async () => {
    const user = makeUser({ id: "USU_PAS", role: "PASSENGER" });
    vi.mocked(requireCurrentUser).mockResolvedValue(user);
    vi.mocked(getPurchaseHistoryForUser).mockResolvedValue({ upcoming: [], past: [] });

    const html = renderToString(await CuentaPage({ params: Promise.resolve({}) }));

    expect(getPurchaseHistoryForUser).toHaveBeenCalledWith("USU_PAS");
    expect(html).toContain("Mis Compras y Pasajes Electrónicos");
    expect(html).toContain("Próximos vuelos y reservas activas");
    expect(html).toContain('href="/cuenta/perfil"');
    expect(html).toContain("Mi perfil");
  });

  it("deja entrar al ADMIN a su cuenta sin consultar compras", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue(makeUser({ role: "ADMIN" }));

    const html = renderToString(await CuentaPage({ params: Promise.resolve({}) }));

    expect(getPurchaseHistoryForUser).not.toHaveBeenCalled();
    expect(html).toContain("Perfil Clerk");
    expect(html).not.toContain("Mis Compras y Pasajes Electrónicos");
  });

  it("renderiza el perfil de Clerk en /cuenta/perfil", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue(makeUser({ role: "PASSENGER" }));

    const html = renderToString(
      await CuentaPage({ params: Promise.resolve({ cuenta: ["perfil"] }) }),
    );

    expect(getPurchaseHistoryForUser).not.toHaveBeenCalled();
    expect(html).toContain("Perfil Clerk hash");
    expect(html).toContain("Mi perfil");
  });

  it("conserva las rutas internas de Clerk como /cuenta/security", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue(makeUser({ role: "PASSENGER" }));

    const html = renderToString(
      await CuentaPage({ params: Promise.resolve({ cuenta: ["security"] }) }),
    );

    expect(getPurchaseHistoryForUser).not.toHaveBeenCalled();
    expect(html).toContain("Perfil Clerk");
    expect(html).not.toContain("Perfil Clerk hash");
  });

  it("devuelve 403 para un usuario deshabilitado", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue(makeUser({ isActive: false }));

    await expect(CuentaPage({ params: Promise.resolve({}) })).rejects.toThrow("forbidden");
    expect(forbidden).toHaveBeenCalled();
    expect(getPurchaseHistoryForUser).not.toHaveBeenCalled();
  });
});
