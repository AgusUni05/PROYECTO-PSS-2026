import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { prismaMock } from "@/tests/prisma-mock";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  SignOutButton: ({ children }: { children: unknown }) => children,
}));

vi.mock("@/lib/auth", () => ({
  canPassengerAccessBooking: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

vi.mock("@/features/flights/contingency-queries", () => ({
  getContingencyByToken: vi.fn(),
  getRebookingAlternatives: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { canPassengerAccessBooking } from "@/lib/auth";
import {
  getContingencyByToken,
  getRebookingAlternatives,
} from "@/features/flights/contingency-queries";
import ContingenciaPage from "./page";

function mockRedirectToSignIn(returnBackUrl?: string) {
  const error = new Error(`redirectToSignIn:${returnBackUrl ?? ""}`);
  (error as { digest?: string }).digest = `NEXT_REDIRECT;replace;/sign-in;`;
  throw error;
}

const pendingView = {
  status: "PENDING" as const,
  token: "tok-abc-123",
  changeType: "CANCELLATION" as const,
  passenger: {
    firstName: "Juan",
    lastName: "Pérez",
    documentType: "DNI" as const,
    documentNumber: "30123456",
  },
  ticket: {
    id: "PAS_1",
    unitPrice: 45000,
    seatClass: "ECONOMY" as const,
    bookingId: "RES_1",
  },
  flight: {
    code: "VU-20261001-001",
    date: new Date("2026-10-01T00:00:00.000Z"),
    origin: { code: "EZE", city: "Buenos Aires" },
    destination: { code: "MDZ", city: "Mendoza" },
    departureAt: new Date("2026-10-01T08:30:00.000Z"),
    arrivalAt: new Date("2026-10-01T10:00:00.000Z"),
  },
  previousDepartureAt: new Date("2026-10-01T08:30:00.000Z"),
  previousArrivalAt: new Date("2026-10-01T10:00:00.000Z"),
  newDepartureAt: null,
  newArrivalAt: null,
};

const alternatives = [
  {
    id: "VUE_2",
    code: "VU-20300104-001",
    date: new Date("2030-01-04T00:00:00.000Z"),
    departureAt: new Date("2030-01-04T08:30:00.000Z"),
    arrivalAt: new Date("2030-01-04T10:00:00.000Z"),
    availableSeats: 140,
  },
];

describe("ContingenciaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      isAuthenticated: true,
      userId: "clerk_1",
      redirectToSignIn: vi.fn((args?: { returnBackUrl?: string }) =>
        mockRedirectToSignIn(args?.returnBackUrl),
      ),
    } as never);
    vi.mocked(canPassengerAccessBooking).mockResolvedValue(true);
    prismaMock.booking.findUnique.mockResolvedValue({
      buyerId: "BUY_1",
      contactEmail: "buyer@example.com",
      channel: "WEB",
    } as never);
  });

  it("muestra estado no encontrado para un token inválido", async () => {
    vi.mocked(getContingencyByToken).mockResolvedValue(null);

    const element = await ContingenciaPage({ params: Promise.resolve({ token: "invalido" }) });
    const html = renderToString(element);

    expect(html).toContain("Enlace no válido");
    expect(getContingencyByToken).toHaveBeenCalledWith("invalido");
    expect(getRebookingAlternatives).not.toHaveBeenCalled();
  });

  it("muestra estado final sin acciones para un token ya resuelto y no consulta alternativas", async () => {
    vi.mocked(getContingencyByToken).mockResolvedValue({
      status: "REFUND",
      resolution: "REFUND",
      resolvedAt: new Date("2026-09-26T14:00:00.000Z"),
    });

    const element = await ContingenciaPage({ params: Promise.resolve({ token: "tok-abc-123" }) });
    const html = renderToString(element);

    expect(html).toContain("Reembolso confirmado");
    expect(html).not.toContain("Reprogramar");
    expect(getRebookingAlternatives).not.toHaveBeenCalled();
    expect(prismaMock.booking.findUnique).not.toHaveBeenCalled();
  });

  it("renderiza las alternativas del servidor y habilita la reprogramación para un token pendiente del titular", async () => {
    vi.mocked(getContingencyByToken).mockResolvedValue(pendingView);
    vi.mocked(getRebookingAlternatives).mockResolvedValue(alternatives);

    const element = await ContingenciaPage({ params: Promise.resolve({ token: "tok-abc-123" }) });
    const html = renderToString(element);

    expect(html).toContain("Tu vuelo fue cancelado");
    expect(html).toContain("Pérez");
    expect(html).toContain("Reprogramar");
    expect(html).toContain("Reembolso");
    expect(html).toContain("Solicitar reembolso");
    expect(html).toContain("Una vez que elijas");
    expect(html).toContain("VU-20300104-001");
    expect(html).toContain("Confirmar reprogramación gratuita");
    expect(html).not.toContain('data-disabled=""');
    expect(getRebookingAlternatives).toHaveBeenCalledWith("tok-abc-123");
    expect(canPassengerAccessBooking).toHaveBeenCalledWith(
      expect.objectContaining({ buyerId: "BUY_1", contactEmail: "buyer@example.com" }),
    );
  });

  it("deshabilita la reprogramación cuando no hay alternativas elegibles", async () => {
    vi.mocked(getContingencyByToken).mockResolvedValue(pendingView);
    vi.mocked(getRebookingAlternatives).mockResolvedValue([]);

    const element = await ContingenciaPage({ params: Promise.resolve({ token: "tok-abc-123" }) });
    const html = renderToString(element);

    expect(html).toContain("No hay vuelos alternativos disponibles");
    expect(html).toContain('data-disabled=""');
  });

  it("redirige a iniciar sesión cuando no hay sesión de Clerk", async () => {
    vi.mocked(auth).mockResolvedValue({
      isAuthenticated: false,
      userId: null,
      redirectToSignIn: vi.fn((args?: { returnBackUrl?: string }) =>
        mockRedirectToSignIn(args?.returnBackUrl),
      ),
    } as never);
    vi.mocked(getContingencyByToken).mockResolvedValue(pendingView);

    await expect(
      ContingenciaPage({ params: Promise.resolve({ token: "tok-abc-123" }) }),
    ).rejects.toThrow("redirectToSignIn:/contingencia/tok-abc-123");
  });

  it("muestra el gate de cuenta equivocada cuando el usuario no tiene acceso a la reserva", async () => {
    vi.mocked(canPassengerAccessBooking).mockResolvedValue(false);
    vi.mocked(getContingencyByToken).mockResolvedValue(pendingView);
    vi.mocked(getRebookingAlternatives).mockResolvedValue([]);

    const element = await ContingenciaPage({ params: Promise.resolve({ token: "tok-abc-123" }) });
    const html = renderToString(element);

    expect(html).toContain("Iniciaste sesión con otra cuenta");
    expect(html).toContain("Cambiar de cuenta");
  });

  it("muestra estado no encontrado si la reserva asociada no existe", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(null);
    vi.mocked(getContingencyByToken).mockResolvedValue(pendingView);

    const element = await ContingenciaPage({ params: Promise.resolve({ token: "tok-abc-123" }) });
    const html = renderToString(element);

    expect(html).toContain("Enlace no válido");
  });
});
