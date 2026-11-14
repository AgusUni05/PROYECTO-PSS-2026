import { describe, expect, it } from "vitest";
import {
  CANCELLATION_REASON_LABELS,
  CANCELLATION_REASONS,
  cancellationTier,
  voluntaryRefundAmounts,
} from "./policy";

const DEPARTURE = new Date("2026-11-20T10:00:00.000Z");
const hoursBefore = (hours: number) => new Date(DEPARTURE.getTime() - hours * 3600_000);

describe("cancellationTier (US-39)", () => {
  it("más de 48 horas antes retiene el 20 %", () => {
    expect(cancellationTier(DEPARTURE, hoursBefore(72))).toMatchObject({ retentionRate: 0.2 });
    expect(cancellationTier(DEPARTURE, new Date(hoursBefore(48).getTime() - 1))).toMatchObject({
      retentionRate: 0.2,
    });
  });

  it("entre 24 y 48 horas antes (inclusive) retiene el 35 %", () => {
    expect(cancellationTier(DEPARTURE, hoursBefore(48))).toMatchObject({ retentionRate: 0.35 });
    expect(cancellationTier(DEPARTURE, hoursBefore(30))).toMatchObject({ retentionRate: 0.35 });
    expect(cancellationTier(DEPARTURE, hoursBefore(24))).toMatchObject({ retentionRate: 0.35 });
  });

  it("menos de 24 horas antes retiene el 50 %", () => {
    expect(cancellationTier(DEPARTURE, new Date(hoursBefore(24).getTime() + 1))).toMatchObject({
      retentionRate: 0.5,
    });
    expect(cancellationTier(DEPARTURE, hoursBefore(1))).toMatchObject({ retentionRate: 0.5 });
  });

  it("con el vuelo ya salido no se puede cancelar", () => {
    expect(cancellationTier(DEPARTURE, DEPARTURE)).toBeNull();
    expect(cancellationTier(DEPARTURE, hoursBefore(-2))).toBeNull();
  });

  it("describe cada tramo para mostrarlo al pasajero", () => {
    expect(cancellationTier(DEPARTURE, hoursBefore(72))?.label).toBe("Más de 48 horas antes");
    expect(cancellationTier(DEPARTURE, hoursBefore(30))?.label).toBe("Entre 24 y 48 horas antes");
    expect(cancellationTier(DEPARTURE, hoursBefore(1))?.label).toBe("Menos de 24 horas antes");
  });
});

describe("voluntaryRefundAmounts (US-39)", () => {
  it("separa la retención y el reintegro del precio pagado", () => {
    expect(voluntaryRefundAmounts("45000", 0.2)).toEqual({ penalty: "9000.00", refund: "36000.00" });
    expect(voluntaryRefundAmounts("45000", 0.35)).toEqual({ penalty: "15750.00", refund: "29250.00" });
    expect(voluntaryRefundAmounts("45000", 0.5)).toEqual({ penalty: "22500.00", refund: "22500.00" });
  });

  it("redondea la retención al centavo y el reintegro completa exactamente lo pagado", () => {
    expect(voluntaryRefundAmounts("33333.33", 0.35)).toEqual({ penalty: "11666.67", refund: "21666.66" });
  });
});

describe("motivos de cancelación (US-39)", () => {
  it("ofrece los motivos del wireframe", () => {
    expect(CANCELLATION_REASONS.map((reason) => CANCELLATION_REASON_LABELS[reason])).toEqual([
      "Imprevisto personal o laboral",
      "Cambio de fechas de vacaciones o estadía",
      "Razones médicas del grupo familiar",
    ]);
  });
});
