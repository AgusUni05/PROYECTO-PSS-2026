import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { CancellationQuote } from "@/features/cancellation/quote";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/cancellation/queries", () => ({ getCancellationQuote: vi.fn() }));
vi.mock("@/features/cancellation/actions", () => ({ cancelBookingAction: vi.fn() }));
vi.mock("@/components/site-header", () => ({ SiteHeader: () => <header>VolAR</header> }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

import { getCurrentUser } from "@/lib/auth";
import { getCancellationQuote } from "@/features/cancellation/queries";
import CancelarPage from "./page";

function quote(overrides: Partial<CancellationQuote> = {}): CancellationQuote {
  return {
    code: "GNQ47M",
    blocked: null,
    paymentMethod: "VISA •••• 1112",
    totals: { paid: "45000.00", penalty: "9000.00", refund: "36000.00" },
    lines: [
      {
        ticketId: "PAS_1",
        passenger: "Laza, Franco",
        seat: "1D",
        seatClass: "ECONOMY",
        flight: {
          id: "VUE_1",
          code: "VU-20261120-002",
          date: new Date("2026-11-20T00:00:00.000Z"),
          departureAt: new Date("2026-11-20T08:30:00.000Z"),
          status: "SCHEDULED",
          origin: { code: "EZE", city: "Buenos Aires" },
          destination: { code: "MDZ", city: "Mendoza" },
        },
        tierLabel: "Más de 48 horas antes",
        retentionRate: 0.2,
        paid: "45000.00",
        penalty: "9000.00",
        refund: "36000.00",
      },
    ],
    ...overrides,
  };
}

async function render(reserva?: string) {
  const searchParams = Promise.resolve(reserva === undefined ? {} : { reserva });
  return renderToString(await CancelarPage({ searchParams }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "USU_SESION", isActive: true } as never);
  vi.mocked(getCancellationQuote).mockResolvedValue(quote());
});

describe("/compra/cancelar (US-39)", () => {
  it("sin código válido no consulta nada", async () => {
    expect(await render("../x")).toContain("No pudimos identificar la reserva");
    expect(getCancellationQuote).not.toHaveBeenCalled();
  });

  it("sin sesión manda a iniciar sesión y vuelve a la cancelación", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    await expect(render("gnq47m")).rejects.toThrow(
      `redirect:/sign-in?${new URLSearchParams({ redirect_url: "/compra/cancelar?reserva=GNQ47M" })}`,
    );
  });

  it("consulta con el código normalizado y el usuario de la sesión", async () => {
    await render("gnq47m");

    expect(getCancellationQuote).toHaveBeenCalledWith("GNQ47M", "USU_SESION");
  });

  it("una reserva ajena o inexistente muestra el mismo estado no encontrado", async () => {
    vi.mocked(getCancellationQuote).mockResolvedValue(null);

    expect(await render("GNQ47M")).toContain("No encontramos esta reserva");
  });

  it("con una contingencia pendiente no ofrece cancelar y deriva a la opción gratuita", async () => {
    vi.mocked(getCancellationQuote).mockResolvedValue(quote({ blocked: "contingency" }));

    const html = await render("GNQ47M");

    expect(html).toContain("sin penalidad");
    expect(html).not.toContain("Solicitar cancelación");
  });

  it("muestra la liquidación y el formulario de cancelación", async () => {
    const html = await render("GNQ47M");

    expect(html).toContain("Cancelar reserva");
    expect(html).toContain("Laza, Franco");
    expect(html).toContain("Monto neto a reembolsar");
    expect(html).toContain("Solicitar cancelación");
  });
});
