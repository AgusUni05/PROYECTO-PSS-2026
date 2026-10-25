import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConfirmActionDialog } from "./confirm-action-dialog";

describe("ConfirmActionDialog", () => {
  it("muestra el trigger y mantiene el diálogo cerrado hasta interacción", () => {
    const html = renderToString(
      <ConfirmActionDialog
        open={false}
        onOpenChange={vi.fn()}
        triggerLabel="Dar de Baja"
        title="Dar de baja VU-01"
        description="Dejará de estar disponible."
        confirmLabel="Confirmar Baja"
        pendingLabel="Dando de baja…"
        isPending={false}
        onConfirm={vi.fn()}
      />,
    );

    expect(html).toContain("Dar de Baja");
    expect(html).not.toContain("Confirmar Baja");
  });
});
