import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { CheckinFlightGroup, CheckinView } from "@/features/checkin/queries";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/checkin/queries", () => ({ getCheckinView: vi.fn() }));
vi.mock("@/features/checkin/actions", () => ({ checkInAction: vi.fn() }));
vi.mock("@/components/site-header", () => ({ SiteHeader: () => <header>VolAR</header> }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

import { getCurrentUser } from "@/lib/auth";
import { getCheckinView } from "@/features/checkin/queries";
import CheckinPage from "./page";

const user = { id: "USU_SESION", isActive: true };

function group(overrides: Partial<CheckinFlightGroup> = {}): CheckinFlightGroup {
  return {
    flight: {
      id: "VUE_1",
      code: "VU-20261120-002",
      date: new Date("2026-11-20T00:00:00.000Z"),
      departureAt: new Date("2026-11-20T10:00:00.000Z"),
      origin: { code: "EZE", city: "Buenos Aires" },
      destination: { code: "MDZ", city: "Mendoza" },
    },
    state: "open",
    opensAt: new Date("2026-11-19T10:00:00.000Z"),
    boardingAt: new Date("2026-11-20T09:20:00.000Z"),
    passengers: [
      {
        id: "PAS_1",
        firstName: "Maria",
        lastName: "Demo",
        documentType: "DNI",
        documentNumber: "30000001",
        seat: "1A",
        seatClass: "ECONOMY",
        number: "ETK-DEMO0001-1",
        checkedInAt: null,
        extraBags: 0,
      },
    ],
    ...overrides,
  };
}

function view(overrides: Partial<CheckinView> = {}): CheckinView {
  return { code: "DEMO0001", status: "CONFIRMED", groups: [group()], ...overrides };
}

async function render(reserva?: string) {
  const searchParams = Promise.resolve(reserva === undefined ? {} : { reserva });
  return renderToString(await CheckinPage({ searchParams }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(user as never);
  vi.mocked(getCheckinView).mockResolvedValue(view());
});

describe("/compra/checkin (US-38)", () => {
  it("sin código válido no consulta nada", async () => {
    const html = await render("../x");

    expect(html).toContain("No pudimos identificar la reserva");
    expect(getCheckinView).not.toHaveBeenCalled();
  });

  it("sin sesión manda a iniciar sesión y vuelve al check-in", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    await expect(render("demo0001")).rejects.toThrow(
      `redirect:/sign-in?${new URLSearchParams({ redirect_url: "/compra/checkin?reserva=DEMO0001" })}`,
    );
  });

  it("consulta con el código normalizado y el usuario de la sesión", async () => {
    await render("demo0001");

    expect(getCheckinView).toHaveBeenCalledWith("DEMO0001", "USU_SESION");
  });

  it("una reserva ajena o inexistente muestra el mismo estado no encontrado", async () => {
    vi.mocked(getCheckinView).mockResolvedValue(null);

    const html = await render("DEMO0001");

    expect(html).toContain("No encontramos esta reserva");
  });

  it("una compra no confirmada no permite el check-in", async () => {
    vi.mocked(getCheckinView).mockResolvedValue(view({ status: "CANCELLED" }));

    const html = await render("DEMO0001");

    expect(html).toContain("Esta compra no está confirmada");
    expect(html).not.toContain("Confirmar check-in");
  });

  it("muestra cada vuelo de la reserva con su check-in", async () => {
    const html = await render("DEMO0001");

    expect(html).toContain("Check-in online");
    expect(html).toContain("VU-20261120-002");
    expect(html).toContain("Confirmar check-in");
    expect(html).not.toContain("tarjetas-embarque");
  });

  it("si alguien hizo el check-in ofrece descargar las tarjetas de embarque", async () => {
    const done = group();
    done.passengers[0] = { ...done.passengers[0], checkedInAt: new Date("2026-11-19T20:00:00.000Z") };
    vi.mocked(getCheckinView).mockResolvedValue(view({ groups: [done] }));

    const html = await render("DEMO0001");

    expect(html).toContain('href="/api/compras/DEMO0001/tarjetas-embarque"');
    expect(html).toContain("Descargar tarjetas de embarque (1 PDF)");
  });
});
