import { describe, expect, it } from "vitest";
import { reportFiltersSchema } from "./schema";

describe("reportFiltersSchema (US-27)", () => {
  it("usa el primer día del mes actual y hoy como rango por defecto", () => {
    const result = reportFiltersSchema.parse({});

    expect(result.desde).toMatch(/^\d{4}-\d{2}-01$/);
    expect(result.hasta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.clase).toBe("todas");
    expect(result.ruta).toBe("");
    expect(result.page).toBe(1);
  });

  it("acepta un rango de fechas, ruta y clase explícitos", () => {
    const result = reportFiltersSchema.parse({
      desde: "2026-10-01",
      hasta: "2026-10-31",
      ruta: "TRA_01",
      clase: "ECONOMY",
      page: "2",
    });

    expect(result).toEqual({
      desde: "2026-10-01",
      hasta: "2026-10-31",
      ruta: "TRA_01",
      clase: "ECONOMY",
      page: 2,
    });
  });

  it("descarta valores inválidos y vuelve a los defaults", () => {
    const result = reportFiltersSchema.parse({ desde: "no-es-fecha", clase: "otra", page: "-3" });

    expect(result.desde).toMatch(/^\d{4}-\d{2}-01$/);
    expect(result.clase).toBe("todas");
    expect(result.page).toBe(1);
  });
});
