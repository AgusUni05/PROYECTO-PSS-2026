import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminRuleNotice } from "./admin-rule-notice";

describe("AdminRuleNotice", () => {
  it("renders the shared title and page-specific guidance", () => {
    const markup = renderToStaticMarkup(
      <AdminRuleNotice>
        <span>La regla específica de esta sección.</span>
      </AdminRuleNotice>,
    );

    expect(markup).toContain("Regla integrada");
    expect(markup).toContain("La regla específica de esta sección.");
  });

  it("allows the plural title used by flight administration", () => {
    const markup = renderToStaticMarkup(
      <AdminRuleNotice title="Reglas integradas">Reglas operativas.</AdminRuleNotice>,
    );

    expect(markup).toContain("Reglas integradas");
    expect(markup).toContain("Reglas operativas.");
  });
});
