import { describe, expect, it } from "vitest";
import { newId } from "@/lib/id";
import { baggageSchema } from "./schema";

const TICKET = newId("Ticket");

const values = (valijas: { pasaje: string; cantidad: number }[]) => ({
  reserva: "GNQ47M",
  valijas,
  medioPago: "CREDIT" as const,
  numeroTarjeta: "4111 1111 1111 1112",
  titular: "Franco Laza",
  vencimiento: "12/30",
  cvv: "123",
  cuotas: 1,
});

describe("baggageSchema (US-41)", () => {
  it("acepta valijas por pasajero con los datos de tarjeta", () => {
    expect(baggageSchema.safeParse(values([{ pasaje: TICKET, cantidad: 2 }])).success).toBe(true);
  });

  it("exige al menos una valija", () => {
    expect(baggageSchema.safeParse(values([])).success).toBe(false);
    expect(baggageSchema.safeParse(values([{ pasaje: TICKET, cantidad: 0 }])).success).toBe(false);
  });

  it("no permite más de 3 valijas por pasajero", () => {
    expect(baggageSchema.safeParse(values([{ pasaje: TICKET, cantidad: 4 }])).success).toBe(false);
  });

  it("no permite repetir el pasajero", () => {
    const result = baggageSchema.safeParse(
      values([
        { pasaje: TICKET, cantidad: 1 },
        { pasaje: TICKET, cantidad: 1 },
      ]),
    );
    expect(result.success).toBe(false);
  });
});
