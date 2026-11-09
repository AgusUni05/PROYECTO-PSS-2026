import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { addDaysToDateString, todayDateString } from "@/lib/dates";
import type { FlightSearchResult } from "@/features/flight-search/queries";
import type { FlexibleDay } from "@/features/flight-search/flexible-dates";

vi.mock("@/components/site-header", () => ({
  SiteHeader: () => <header>VolAR</header>,
}));

vi.mock("@/features/flight-search/queries", () => ({
  searchFlights: vi.fn(),
  searchFlexibleDates: vi.fn(),
}));

vi.mock("@/features/airports/queries", () => ({
  listActiveAirports: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { searchFlexibleDates, searchFlights } from "@/features/flight-search/queries";
import { listActiveAirports } from "@/features/airports/queries";
import VuelosPage from "./page";

const ORIGIN = "AER_01JB8Z3K4M5N6P7Q8R9S0T1V2W";
const DESTINATION = "AER_01JB8Z3K4M5N6P7Q8R9S0T1V2X";
const fecha = addDaysToDateString(todayDateString(), 10);
const search = { origen: ORIGIN, destino: DESTINATION, fecha };

const flight: FlightSearchResult = {
  id: "VUE_1",
  code: "VU-DEMO-01",
  date: new Date(`${fecha}T00:00:00.000Z`),
  departureAt: new Date(`${fecha}T08:30:00.000Z`),
  arrivalAt: new Date(`${fecha}T10:00:00.000Z`),
  airplaneModel: "Boeing 737-800",
  origin: { id: ORIGIN, code: "AEP", city: "Buenos Aires" },
  destination: { id: DESTINATION, code: "COR", city: "Córdoba" },
  economyFare: "45000",
  economyAvailable: 100,
  firstClassFare: "95000",
  firstClassAvailable: 10,
};

const flexibleDays: FlexibleDay[] = [-3, -2, -1, 0, 1, 2, 3].map((offset) => ({
  date: addDaysToDateString(fecha, offset),
  offset,
  status: offset === 2 ? "available" : "empty",
  flightCount: offset === 2 ? 1 : 0,
  availableSeats: offset === 2 ? 110 : 0,
  minFare: offset === 2 ? "45000" : null,
  isCheapest: false,
}));

async function render(sp: Record<string, string>) {
  return renderToString(await VuelosPage({ searchParams: Promise.resolve(sp) }));
}

describe("/vuelos (US-13 / US-42)", () => {
  beforeEach(() => {
    vi.mocked(listActiveAirports).mockResolvedValue([
      { id: ORIGIN, code: "AEP", name: "Aeroparque", city: "Buenos Aires" },
      { id: DESTINATION, code: "COR", name: "Pajas Blancas", city: "Córdoba" },
    ] as never);
    vi.mocked(searchFlights).mockReset();
    vi.mocked(searchFlexibleDates).mockReset();
  });

  it("con vuelos en la fecha exacta no consulta ni muestra fechas cercanas", async () => {
    vi.mocked(searchFlights).mockResolvedValue([flight]);

    const html = await render(search);

    expect(html).toContain("VU-DEMO-01");
    expect(searchFlexibleDates).not.toHaveBeenCalled();
    expect(html).not.toContain("Fechas cercanas");
  });

  it("sin vuelos en la fecha exacta muestra la grilla de ±3 días", async () => {
    vi.mocked(searchFlights).mockResolvedValue([]);
    vi.mocked(searchFlexibleDates).mockResolvedValue(flexibleDays);

    const html = await render(search);

    expect(searchFlexibleDates).toHaveBeenCalledWith(search);
    expect(html).toContain("No encontramos vuelos disponibles para la fecha seleccionada");
    expect(html).toContain("Fechas cercanas (±3 días)");
    expect(html).toContain(`fecha=${addDaysToDateString(fecha, 2)}`);
  });

  it("sin búsqueda no consulta vuelos ni fechas cercanas", async () => {
    await render({});

    expect(searchFlights).not.toHaveBeenCalled();
    expect(searchFlexibleDates).not.toHaveBeenCalled();
  });
});
