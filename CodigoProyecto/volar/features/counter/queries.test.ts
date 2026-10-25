import { describe, expect, it } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { searchReservations } from "./queries";

const row = {
  code: "ABC123",
  contactName: "Pérez, Juan Carlos",
  status: "CONFIRMED" as const,
  channel: "WEB" as const,
  flight: {
    code: "VU-20261002-01",
    date: new Date("2026-10-02T00:00:00.000Z"),
    route: { origin: { code: "AEP" }, destination: { code: "COR" } },
  },
};

describe("searchReservations (US-34)", () => {
  it("devuelve vacío para un criterio vacío, sin consultar la base", async () => {
    const result = await searchReservations("   ");

    expect(result).toEqual([]);
    expect(prismaMock.booking.findMany).not.toHaveBeenCalled();
  });

  it("busca por código, nombre de contacto, documento o apellido de los pasajeros", async () => {
    prismaMock.booking.findMany.mockResolvedValue([row] as never);

    const result = await searchReservations("32456789");

    expect(result).toEqual([
      {
        code: "ABC123",
        contactName: "Pérez, Juan Carlos",
        status: "CONFIRMED",
        channel: "WEB",
        flightCode: "VU-20261002-01",
        originCode: "AEP",
        destinationCode: "COR",
        date: row.flight.date,
      },
    ]);
    expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { code: "32456789" },
            expect.objectContaining({ contactName: expect.anything() }),
          ]),
        }),
      }),
    );
  });
});
