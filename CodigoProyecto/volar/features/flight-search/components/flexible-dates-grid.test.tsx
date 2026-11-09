import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { formatCurrency } from "@/features/flights/format";
import type { FlexibleDay } from "../flexible-dates";
import { FlexibleDatesGrid } from "./flexible-dates-grid";

// ListNavLink navega con el router de Next; en renderToString no hay app router montado.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const search = { origen: "AER_AEP", destino: "AER_COR", fecha: "2026-10-01" };

function day(offset: number, date: string, overrides: Partial<FlexibleDay> = {}): FlexibleDay {
  return {
    date,
    offset,
    status: "empty",
    flightCount: 0,
    availableSeats: 0,
    minFare: null,
    isCheapest: false,
    ...overrides,
  };
}

const days: FlexibleDay[] = [
  day(-3, "2026-09-28", { status: "available", flightCount: 1, availableSeats: 64, minFare: "42000" }),
  day(-2, "2026-09-29", { status: "unavailable" }),
  day(-1, "2026-09-30"),
  day(0, "2026-10-01"),
  day(1, "2026-10-02", { status: "available", flightCount: 2, availableSeats: 147, minFare: "45000" }),
  day(2, "2026-10-03"),
  day(3, "2026-10-04", {
    status: "available",
    flightCount: 1,
    availableSeats: 150,
    minFare: "41000",
    isCheapest: true,
  }),
];

/** Divide el HTML por celda (<li>) para afirmar sobre cada día por separado. */
function cells(html: string): string[] {
  return html.split("<li").slice(1);
}

describe("FlexibleDatesGrid (US-42)", () => {
  it("muestra los 7 días de -3 a +3 con la fecha buscada marcada", () => {
    const html = renderToString(<FlexibleDatesGrid days={days} search={search} />);
    const list = cells(html);

    expect(list).toHaveLength(7);
    expect(list[0]).toContain("-3 días");
    expect(list[0]).toContain("Lun 28/09");
    expect(list[2]).toContain("-1 día");
    expect(list[3]).toContain("Fecha buscada");
    expect(list[3]).toContain("Jue 01/10");
    expect(list[4]).toContain("+1 día");
    expect(list[6]).toContain("+3 días");
  });

  it("cada día con vuelos enlaza a la búsqueda de ese día, conservando origen y destino", () => {
    const html = renderToString(<FlexibleDatesGrid days={days} search={search} />);
    const list = cells(html);

    expect(list[4]).toContain('href="/vuelos?origen=AER_AEP&amp;destino=AER_COR&amp;fecha=2026-10-02"');
    expect(list[4]).toContain(formatCurrency("45000"));
    expect(list[4]).toContain("2 vuelos · 147 cupos");
    expect(list[0]).toContain("1 vuelo · 64 cupos");
  });

  it("marca el menor precio solo en el día más barato", () => {
    const list = cells(renderToString(<FlexibleDatesGrid days={days} search={search} />));

    expect(list[6]).toContain("Menor precio");
    expect(list.filter((cell) => cell.includes("Menor precio"))).toHaveLength(1);
  });

  it("los días sin vuelos o fuera de rango no son seleccionables", () => {
    const list = cells(renderToString(<FlexibleDatesGrid days={days} search={search} />));

    expect(list[3]).toContain("Sin vuelos");
    expect(list[3]).not.toContain("href=");
    expect(list[1]).toContain("No disponible");
    expect(list[1]).not.toContain("href=");
  });

  it("avisa cuando tampoco hay vuelos en los días cercanos", () => {
    const empty = days.map((d) => ({ ...d, status: "empty" as const, minFare: null, isCheapest: false }));
    const html = renderToString(<FlexibleDatesGrid days={empty} search={search} />);

    expect(html).toContain("Tampoco hay vuelos a la venta en los días cercanos");
    expect(html).not.toContain("href=");
  });
});
