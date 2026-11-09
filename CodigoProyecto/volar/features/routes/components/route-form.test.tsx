import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../actions", () => ({ createRouteAction: vi.fn(), updateRouteAction: vi.fn() }));

import { RouteForm } from "./route-form";

const airports = [
  { id: "AER_EZE", code: "EZE", name: "Ministro Pistarini", city: "Buenos Aires" },
  { id: "AER_MDZ", code: "MDZ", name: "El Plumerillo", city: "Mendoza" },
];

describe("RouteForm (US-03 / US-40)", () => {
  it("origen y destino son buscadores de aeropuertos asociados a sus labels", () => {
    const html = renderToString(<RouteForm airports={airports} />);

    expect(html).toContain('for="originId"');
    expect(html).toMatch(/<input[^>]*id="originId"[^>]*role="combobox"|<input[^>]*role="combobox"[^>]*id="originId"/);
    expect(html).toMatch(/<input[^>]*id="destinationId"[^>]*role="combobox"|<input[^>]*role="combobox"[^>]*id="destinationId"/);
  });

  it("al editar, origen y destino arrancan completados con los aeropuertos del trayecto", () => {
    const html = renderToString(
      <RouteForm
        airports={airports}
        editing={{
          id: "TRA_1",
          values: {
            originId: "AER_EZE",
            destinationId: "AER_MDZ",
            operatingDays: ["MONDAY"],
            departureTime: "08:30",
            arrivalTime: "10:00",
          },
        }}
      />,
    );

    expect(html).toContain('value="EZE — Ministro Pistarini · Buenos Aires"');
    expect(html).toContain('value="MDZ — El Plumerillo · Mendoza"');
  });
});
