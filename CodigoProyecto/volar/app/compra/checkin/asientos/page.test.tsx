import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { SeatSelectionView } from "@/features/seats/queries";
import { cabinSection } from "@/features/seats/cabin";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/seats/queries", () => ({ getSeatSelectionView: vi.fn() }));
vi.mock("@/features/seats/actions", () => ({ chooseSeatsAction: vi.fn() }));
vi.mock("@/components/site-header", () => ({ SiteHeader: () => <header>VolAR</header> }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

import { getCurrentUser } from "@/lib/auth";
import { getSeatSelectionView } from "@/features/seats/queries";
import AsientosPage from "./page";

const user = { id: "USU_SESION", isActive: true };

function view(overrides: Partial<SeatSelectionView> = {}): SeatSelectionView {
  return {
    code: "DEMO0001",
    status: "CONFIRMED",
    flights: [
      {
        flight: {
          id: "VUE_1",
          code: "VU-20261120-002",
          date: new Date("2026-11-20T00:00:00.000Z"),
          departureAt: new Date("2026-11-20T10:00:00.000Z"),
          origin: { code: "EZE", city: "Buenos Aires" },
          destination: { code: "MDZ", city: "Mendoza" },
        },
        boardingAt: new Date("2026-11-20T09:20:00.000Z"),
        seatClass: "ECONOMY",
        section: cabinSection({ economyCapacity: 12, firstClassCapacity: 4 }, "ECONOMY"),
        otherClass: "FIRST",
        occupied: [],
        passengers: [{ id: "PAS_1", name: "Demo, Maria", seat: "2A" }],
      },
    ],
    ...overrides,
  };
}

async function render(reserva?: string) {
  const searchParams = Promise.resolve(reserva === undefined ? {} : { reserva });
  return renderToString(await AsientosPage({ searchParams }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(user as never);
  vi.mocked(getSeatSelectionView).mockResolvedValue(view());
});

describe("AsientosPage (US-37)", () => {
  it("sin código válido no consulta nada", async () => {
    const html = await render("x");

    expect(html).toContain("No pudimos identificar la reserva");
    expect(getSeatSelectionView).not.toHaveBeenCalled();
  });

  it("sin sesión manda a iniciar sesión y vuelve a la elección de asientos", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    await expect(render("demo0001")).rejects.toThrow(
      "redirect:/sign-in?redirect_url=%2Fcompra%2Fcheckin%2Fasientos%3Freserva%3DDEMO0001",
    );
  });

  it("consulta con el código normalizado y el usuario de la sesión", async () => {
    await render("demo0001");

    expect(getSeatSelectionView).toHaveBeenCalledWith("DEMO0001", "USU_SESION");
  });

  it("una reserva ajena o inexistente muestra el mismo estado no encontrado", async () => {
    vi.mocked(getSeatSelectionView).mockResolvedValue(null);

    expect(await render("DEMO0001")).toContain("No encontramos esta reserva");
  });

  it("sin vuelos para elegir asientos pasa directo al check-in", async () => {
    vi.mocked(getSeatSelectionView).mockResolvedValue(view({ flights: [] }));

    await expect(render("DEMO0001")).rejects.toThrow("redirect:/compra/checkin?reserva=DEMO0001");
  });

  it("es el paso 1 del check-in, con el vuelo y el mapa de la cabina", async () => {
    const html = await render("DEMO0001");

    expect(html).toContain("Paso 1 de 2: elegí los asientos.");
    expect(html).toContain("VU-20261120-002");
    expect(html).toContain("Clase Economy.");
    expect(html).toContain('aria-label="Asiento 2A, de Demo, Maria"');
    expect(html).toContain("Confirmar asientos y continuar al check-in");
  });
});
