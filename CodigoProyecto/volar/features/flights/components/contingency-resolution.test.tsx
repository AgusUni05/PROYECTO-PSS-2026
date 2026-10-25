import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

vi.mock("@/features/flights/contingency-actions", () => ({
  resolveRefundAction: vi.fn(),
  resolveRebookingAction: vi.fn(),
}));

import { resolveRebookingAction } from "@/features/flights/contingency-actions";
import {
  ContingencyNotFound,
  ContingencyResolution,
} from "./contingency-resolution";
import {
  buildRebookingConfirmation,
  buildRefundConfirmation,
  submitRebooking,
} from "./contingency-resolution.utils";

const pendingView = {
  status: "PENDING" as const,
  token: "tok-abc-123",
  changeType: "CANCELLATION" as const,
  passenger: {
    firstName: "Juan",
    lastName: "Pérez",
    documentType: "DNI" as const,
    documentNumber: "30123456",
  },
  ticket: {
    id: "PAS_1",
    unitPrice: 45000,
    seatClass: "ECONOMY" as const,
    bookingId: "RES_1",
  },
  flight: {
    code: "VU-20261001-001",
    date: new Date("2026-10-01T00:00:00.000Z"),
    origin: { code: "EZE", city: "Buenos Aires" },
    destination: { code: "MDZ", city: "Mendoza" },
    departureAt: new Date("2026-10-01T08:30:00.000Z"),
    arrivalAt: new Date("2026-10-01T10:00:00.000Z"),
  },
  previousDepartureAt: new Date("2026-10-01T08:30:00.000Z"),
  previousArrivalAt: new Date("2026-10-01T10:00:00.000Z"),
  newDepartureAt: null,
  newArrivalAt: null,
};

describe("ContingencyNotFound", () => {
  it("muestra mensaje de enlace no válido", () => {
    const html = renderToString(<ContingencyNotFound />);
    expect(html).toContain("Enlace no válido");
    expect(html).toContain("incompleto");
  });
});

describe("ContingencyResolution", () => {
  it("muestra estado final sin acciones para un token resuelto como reembolso", () => {
    const html = renderToString(
      <ContingencyResolution view={{ status: "REFUND", resolution: "REFUND", resolvedAt: new Date("2026-09-26T14:00:00.000Z") }} />,
    );
    expect(html).toContain("Reembolso confirmado");
    expect(html).not.toContain("Reprogramar");
    expect(html).not.toContain("Solicitar reembolso");
  });

  it("muestra estado final sin acciones para un token resuelto como reprogramación", () => {
    const html = renderToString(
      <ContingencyResolution view={{ status: "REBOOK", resolution: "REBOOK", resolvedAt: new Date("2026-09-26T15:00:00.000Z") }} />,
    );
    expect(html).toContain("Reprogramación confirmada");
    expect(html).not.toContain("Reprogramar");
    expect(html).not.toContain("Solicitar reembolso");
  });

  it("muestra resumen, advertencia de irrevocabilidad, reprogramación deshabilitada y reembolso habilitado para un token pendiente", () => {
    const html = renderToString(<ContingencyResolution view={pendingView} />);

    expect(html).toContain("Tu vuelo fue cancelado");
    // React server render injects comment nodes around whitespace; assert parts instead of the full string.
    expect(html).toContain("Pérez");
    expect(html).toContain("Juan");
    expect(html).toContain("DNI");
    expect(html).toContain("30123456");
    expect(html).toContain("VU-20261001-001");
    expect(html).toContain("Buenos Aires");
    expect(html).toContain("Mendoza");
    expect(html).toContain("Economy");
    expect(html).toMatch(/\$\s*45\.000/);

    expect(html).toContain("Reprogramar");
    expect(html).toContain("Reembolso");
    expect(html).toContain("Solicitar reembolso");
    expect(html).toContain("Una vez que elijas");

    // Sin alternativas cargadas la reprogramación queda deshabilitada.
    expect(html).toContain("No hay vuelos alternativos disponibles");
    expect(html).toContain('data-disabled=""');
  });

  it("muestra los vuelos alternativos con su cupo y habilita la confirmación de reprogramación", () => {
    const html = renderToString(
      <ContingencyResolution
        view={pendingView}
        alternatives={[
          {
            id: "VUE_2",
            code: "VU-20300104-001",
            date: new Date("2030-01-04T00:00:00.000Z"),
            departureAt: new Date("2030-01-04T08:30:00.000Z"),
            arrivalAt: new Date("2030-01-04T10:00:00.000Z"),
            availableSeats: 140,
          },
          {
            id: "VUE_3",
            code: "VU-20300105-001",
            date: new Date("2030-01-05T00:00:00.000Z"),
            departureAt: new Date("2030-01-05T08:30:00.000Z"),
            arrivalAt: new Date("2030-01-05T10:00:00.000Z"),
            availableSeats: 1,
          },
        ]}
      />,
    );

    expect(html).toContain("Elegir vuelo alternativo");
    expect(html).toContain("VU-20300104-001");
    expect(html).toContain("140 cupos libres");
    expect(html).toContain("VU-20300105-001");
    expect(html).toContain("1 cupo libre");
    expect(html).toContain("Confirmar reprogramación gratuita");
    expect(html).not.toContain('data-disabled=""');
    expect(html).not.toContain("No hay vuelos alternativos disponibles");
  });

  it("muestra Pasaporte cuando el documento no es DNI (M8)", () => {
    const html = renderToString(
      <ContingencyResolution
        view={{
          ...pendingView,
          passenger: {
            firstName: "Ana",
            lastName: "Gómez",
            documentType: "PASSPORT" as const,
            documentNumber: "AB123456",
          },
        }}
      />,
    );

    expect(html).toContain("Pasaporte");
    expect(html).toContain("AB123456");
    expect(html).not.toContain("DNI");
  });

  it("pide confirmación explícita antes de reembolsar (M1)", () => {
    // El primer clic solo abre el diálogo; la acción vive en AlertDialogAction.
    const html = renderToString(<ContingencyResolution view={pendingView} />);
    expect(html).toContain("Solicitar reembolso");
    expect(html).not.toContain("Reembolso registrado");

    const confirmation = buildRefundConfirmation(45000);
    expect(confirmation.title).toContain("Confirmar reembolso");
    expect(confirmation.confirmLabel).toBe("Confirmar reembolso");
    expect(confirmation.cancelLabel).toBe("Volver");
    expect(confirmation.description).toContain("no se puede deshacer");
    expect(confirmation.description).toMatch(/\$\s*45\.000/);
  });

  it("pide confirmación explícita antes de reprogramar (M1)", () => {
    const html = renderToString(
      <ContingencyResolution
        view={pendingView}
        alternatives={[
          {
            id: "VUE_2",
            code: "VU-20300104-001",
            date: new Date("2030-01-04T00:00:00.000Z"),
            departureAt: new Date("2030-01-04T08:30:00.000Z"),
            arrivalAt: new Date("2030-01-04T10:00:00.000Z"),
            availableSeats: 140,
          },
        ]}
      />,
    );
    expect(html).toContain("Confirmar reprogramación gratuita");
    expect(html).not.toContain("Reprogramación registrada");

    const confirmation = buildRebookingConfirmation("VU-20300104-001");
    expect(confirmation.title).toContain("Confirmar reprogramación");
    expect(confirmation.description).toContain("VU-20300104-001");
    expect(confirmation.description).toContain("no se puede deshacer");
    expect(confirmation.cancelLabel).toBe("Volver");
  });

  it("envía el token y el vuelo alternativo seleccionado a la server action", async () => {
    vi.mocked(resolveRebookingAction).mockResolvedValue({
      ok: true,
      data: { ticketNumber: "ETK-RES1A2B3-1-R1", flightCode: "VU-20300104-001", seat: "1B" },
    });

    const result = await submitRebooking("tok-abc-123", "VUE_2");

    expect(resolveRebookingAction).toHaveBeenCalledWith("tok-abc-123", "VUE_2");
    expect(result.ok).toBe(true);
  });
});
