import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { User } from "@/generated/prisma/client";
import type { PurchaseComprobantes } from "@/features/purchase/queries";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/purchase/queries", () => ({
  getBookingComprobantesForBuyer: vi.fn(),
  getBookingComprobantes: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

vi.mock("@/components/site-header", () => ({
  SiteHeader: () => <header>VolAR</header>,
}));

import { getCurrentUser } from "@/lib/auth";
import {
  getBookingComprobantes,
  getBookingComprobantesForBuyer,
} from "@/features/purchase/queries";
import { redirect } from "next/navigation";
import ComprobantesPage from "./page";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "USR_SESSION",
    clerkId: "clerk_session",
    email: "sesion@volar.test",
    firstName: "Sesión",
    lastName: "Demo",
    documentType: null,
    documentNumber: null,
    phone: null,
    role: "PASSENGER",
    isActive: true,
    createdById: null,
    createdAt: new Date("2026-10-01T12:00:00.000Z"),
    updatedAt: new Date("2026-10-01T12:00:00.000Z"),
    ...overrides,
  };
}

const issuedAt = new Date("2026-10-07T12:00:00.000Z");
const flight = {
  code: "VU-DEMO-01",
  date: new Date("2026-10-29T00:00:00.000Z"),
  departureAt: new Date("2026-10-29T08:30:00.000Z"),
  arrivalAt: new Date("2026-10-29T11:30:00.000Z"),
  origin: { code: "AEP", city: "Buenos Aires" },
  destination: { code: "COR", city: "Córdoba" },
};

function makePurchase(overrides: Partial<PurchaseComprobantes> = {}): PurchaseComprobantes {
  return {
    code: "DEMO0001",
    status: "CONFIRMED",
    seatClass: "ECONOMY",
    quantity: 2,
    totalAmount: "90000",
    confirmedAt: issuedAt,
    contactEmail: "demo@volar.test",
    flight,
    tickets: [
      {
        id: "PAS_1",
        number: "ETK-DEMO0001-1",
        seat: "1A",
        seatClass: "ECONOMY",
        firstName: "María",
        lastName: "Demo",
        documentType: "DNI",
        documentNumber: "30000001",
        status: "ISSUED",
        issuedAt,
        flight,
      },
      {
        id: "PAS_2",
        number: "ETK-DEMO0001-2",
        seat: "1B",
        seatClass: "ECONOMY",
        firstName: "Juan",
        lastName: "Demo",
        documentType: "PASSPORT",
        documentNumber: "AB123456",
        status: "REFUNDED",
        issuedAt,
        flight,
      },
    ],
    invoice: {
      id: "FAC_1",
      number: 1,
      customerName: "Pasajero Demo",
      customerEmail: "demo@volar.test",
      totalAmount: "90000",
      issuedAt,
      items: [
        { id: "ITEM_1", description: "Pasaje Economy VU-DEMO-01", quantity: 1, unitPrice: "45000", amount: "45000" },
      ],
    },
    email: { recipientEmail: "demo@volar.test", status: "SENT", sentAt: issuedAt },
    transactionId: "TX-ABCDEF123456",
    ...overrides,
  };
}

function renderPage(reserva: string | string[] | undefined) {
  return ComprobantesPage({ searchParams: Promise.resolve({ reserva }) });
}

// US-35/US-36 + I2: los comprobantes se cargan solo para el comprador de la sesión.
describe("ComprobantesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirige a sign-in sin sesión y no consulta la reserva", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    await expect(renderPage("DEMO0001")).rejects.toThrow("redirect:/sign-in");

    expect(redirect).toHaveBeenCalledWith(
      "/sign-in?redirect_url=%2Fcompra%2Fcomprobantes%3Freserva%3DDEMO0001",
    );
    expect(getBookingComprobantesForBuyer).not.toHaveBeenCalled();
    expect(getBookingComprobantes).not.toHaveBeenCalled();
  });

  it("consulta por código y por el id del usuario de la sesión, nunca por un id del cliente", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeUser({ id: "USR_SESSION" }));
    vi.mocked(getBookingComprobantesForBuyer).mockResolvedValue(makePurchase());

    await renderPage("demo0001");

    expect(getBookingComprobantesForBuyer).toHaveBeenCalledWith("DEMO0001", "USR_SESSION");
    expect(getBookingComprobantes).not.toHaveBeenCalled();
  });

  it("otro comprador no puede ver los comprobantes de una reserva ajena", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeUser({ id: "USR_OTHER" }));
    // El filtro server-side no encuentra la reserva: mismo estado que inexistente.
    vi.mocked(getBookingComprobantesForBuyer).mockResolvedValue(null);

    const html = renderToString(await renderPage("DEMO0001"));

    expect(getBookingComprobantesForBuyer).toHaveBeenCalledWith("DEMO0001", "USR_OTHER");
    expect(html).toContain("No encontramos esta reserva");
    expect(html).not.toContain("ETK-DEMO0001-1");
    expect(html).not.toContain("Pasajes electrónicos emitidos");
  });

  it("muestra solo los e-tickets ISSUED y cuenta los pasajes vigentes (I3)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeUser());
    vi.mocked(getBookingComprobantesForBuyer).mockResolvedValue(makePurchase());

    // React intercala comentarios de texto en SSR; se eliminan para comparar copy.
    const html = renderToString(await renderPage("DEMO0001")).replace(/<!--.*?-->/g, "");

    expect(html).toContain("Pasajes electrónicos emitidos (1)");
    expect(html).toContain("ETK-DEMO0001-1");
    expect(html).toContain("María");
    expect(html).not.toContain("ETK-DEMO0001-2");
    expect(html).not.toContain("AB123456");
    expect(html).toContain("Descargar E-Tickets (1 pasaje PDF)");
  });
});
