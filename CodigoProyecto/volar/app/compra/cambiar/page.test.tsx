import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { ChangeView } from "@/features/date-change/queries";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/date-change/queries", () => ({ getChangeView: vi.fn() }));
vi.mock("@/features/date-change/actions", () => ({ changeBookingAction: vi.fn() }));
vi.mock("@/components/site-header", () => ({ SiteHeader: () => <header>VolAR</header> }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

import { getCurrentUser } from "@/lib/auth";
import { getChangeView } from "@/features/date-change/queries";
import CambiarPage from "./page";

const candidate = {
  id: "VUE_B",
  code: "VU-20261119-002",
  date: new Date("2026-11-19T00:00:00.000Z"),
  departureAt: new Date("2026-11-19T08:30:00.000Z"),
  arrivalAt: new Date("2026-11-19T10:00:00.000Z"),
  fare: "48000",
  available: 104,
  capacity: 105,
};

function view(overrides: Partial<ChangeView> = {}): ChangeView {
  return {
    booking: {
      id: "RES_1",
      code: "GNQ47M",
      status: "CONFIRMED",
      paymentMethod: "VISA •••• 1112",
      tickets: [
        {
          id: "PAS_1",
          unitPrice: "45000",
          seat: "1D",
          seatClass: "ECONOMY",
          firstName: "Franco",
          lastName: "Laza",
          hasPendingContingency: false,
          flight: {
            id: "VUE_1",
            code: "VU-20261116-002",
            date: new Date("2026-11-16T00:00:00.000Z"),
            departureAt: new Date("2026-11-16T08:30:00.000Z"),
            status: "SCHEDULED",
            origin: { code: "EZE", city: "Buenos Aires" },
            destination: { code: "MDZ", city: "Mendoza" },
          },
        },
      ],
    },
    blocked: null,
    candidates: [candidate],
    selected: null,
    ...overrides,
  };
}

async function render(params: Record<string, string> = { reserva: "GNQ47M" }) {
  return renderToString(await CambiarPage({ searchParams: Promise.resolve(params) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "USU_SESION", isActive: true } as never);
  vi.mocked(getChangeView).mockResolvedValue(view());
});

describe("/compra/cambiar (US-39, cambio de fecha)", () => {
  it("sin código válido no consulta nada", async () => {
    expect(await render({ reserva: "../x" })).toContain("No pudimos identificar la reserva");
    expect(getChangeView).not.toHaveBeenCalled();
  });

  it("sin sesión manda a iniciar sesión y vuelve al cambio", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    await expect(render({ reserva: "gnq47m" })).rejects.toThrow(
      `redirect:/sign-in?${new URLSearchParams({ redirect_url: "/compra/cambiar?reserva=GNQ47M" })}`,
    );
  });

  it("consulta con el código normalizado, el usuario de la sesión y el vuelo elegido", async () => {
    await render({ reserva: "gnq47m", vuelo: "VUE_B" });

    expect(getChangeView).toHaveBeenCalledWith("GNQ47M", "USU_SESION", "VUE_B");
  });

  it("una reserva ajena o inexistente muestra el mismo estado no encontrado", async () => {
    vi.mocked(getChangeView).mockResolvedValue(null);

    expect(await render()).toContain("No encontramos esta reserva");
  });

  it("con una contingencia pendiente no ofrece el cambio con penalidad", async () => {
    vi.mocked(getChangeView).mockResolvedValue(view({ blocked: "contingency", candidates: [] }));

    const html = await render();

    expect(html).toContain("sin penalidad");
    expect(html).not.toContain("Elegí el nuevo vuelo");
  });

  it("sin vuelos de la ruta con cupo avisa que no se puede cambiar", async () => {
    vi.mocked(getChangeView).mockResolvedValue(view({ candidates: [] }));

    expect(await render()).toContain("No hay otros vuelos de esta ruta");
  });

  it("sin vuelo elegido muestra la lista y pide elegir uno", async () => {
    const html = await render();

    expect(html).toContain("Cambiar fecha");
    expect(html).toContain("VU-20261116-002");
    expect(html).toContain("VU-20261119-002");
    expect(html).toContain("Elegí un vuelo para ver el desglose");
    expect(html).not.toContain("Pago del adicional");
  });

  it("con un vuelo elegido muestra el desglose y el pago", async () => {
    vi.mocked(getChangeView).mockResolvedValue(
      view({
        selected: {
          candidate,
          quote: {
            code: "GNQ47M",
            blocked: null,
            tierLabel: "Entre 24 y 48 horas antes",
            penaltyRate: 0.25,
            credit: "45000.00",
            newCost: "48000.00",
            fareDifference: "3000.00",
            penalty: "11250.00",
            total: "14250.00",
            lines: [],
          },
        },
      }),
    );

    const html = await render({ reserva: "GNQ47M", vuelo: "VUE_B" });

    expect(html).toContain("Desglose del cambio");
    expect(html).toContain("Pago del adicional");
  });
});
