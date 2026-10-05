import { describe, expect, it } from "vitest";
import { prismaMock } from "@/tests/prisma-mock";
import { completePastFlights } from "./status";

describe("completePastFlights", () => {
  it("marca como COMPLETED solo los SCHEDULED cuya salida ya ocurrió", async () => {
    const now = new Date("2026-10-05T12:00:00Z");
    prismaMock.flight.updateMany.mockResolvedValue({ count: 3 });

    const count = await completePastFlights(now);

    expect(count).toBe(3);
    expect(prismaMock.flight.updateMany).toHaveBeenCalledWith({
      where: { status: "SCHEDULED", departureAt: { lte: now } },
      data: { status: "COMPLETED" },
    });
  });
});
