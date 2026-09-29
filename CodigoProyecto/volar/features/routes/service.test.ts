import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { prismaMock } from "@/tests/prisma-mock";
import { createRoute, deactivateRoute, updateRoute } from "./service";
import type { RouteFormValues } from "./schema";

const validData: RouteFormValues = {
  originId: "AER_1",
  destinationId: "AER_2",
  operatingDays: ["MONDAY", "WEDNESDAY"],
  departureTime: "08:30",
  arrivalTime: "10:00",
};

const aRoute = { id: "TRA_1", code: "TR-001", ...validData, isActive: true, createdAt: new Date(), updatedAt: new Date() };

describe("createRoute", () => {
  it("rechaza si el origen o el destino no son aeropuertos activos", async () => {
    prismaMock.airport.count.mockResolvedValue(1); // solo uno de los dos existe/activo

    const result = await createRoute(validData);

    expect(result.ok).toBe(false);
    expect(prismaMock.route.create).not.toHaveBeenCalled();
  });

  it("genera el código TR-001 para el primer trayecto", async () => {
    prismaMock.airport.count.mockResolvedValue(2);
    prismaMock.route.findFirst.mockResolvedValue(null);
    prismaMock.route.create.mockResolvedValue(aRoute);

    const result = await createRoute(validData);

    expect(result.ok).toBe(true);
    expect(prismaMock.route.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: expect.stringMatching(/^TRA_/),
        code: "TR-001",
        ...validData,
      }),
    });
  });

  it("genera el código correlativo siguiente al último trayecto", async () => {
    prismaMock.airport.count.mockResolvedValue(2);
    prismaMock.route.findFirst.mockResolvedValue({ code: "TR-005" } as never);
    prismaMock.route.create.mockResolvedValue(aRoute);

    await createRoute(validData);

    expect(prismaMock.route.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ code: "TR-006" }) }),
    );
  });

  it("reintenta con el siguiente código si hay una colisión concurrente", async () => {
    prismaMock.airport.count.mockResolvedValue(2);
    prismaMock.route.findFirst
      .mockResolvedValueOnce({ code: "TR-001" } as never)
      .mockResolvedValueOnce({ code: "TR-002" } as never);
    prismaMock.route.create
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "7.10.0",
          meta: { target: ["code"] },
        }),
      )
      .mockResolvedValueOnce(aRoute);

    const result = await createRoute(validData);

    expect(result.ok).toBe(true);
    expect(prismaMock.route.create).toHaveBeenCalledTimes(2);
  });
});

describe("updateRoute", () => {
  it("rechaza la modificación si el trayecto ya tiene pasajes vendidos", async () => {
    prismaMock.ticket.count.mockResolvedValue(3);

    const result = await updateRoute("TRA_1", validData);

    expect(result.ok).toBe(false);
    expect(prismaMock.route.update).not.toHaveBeenCalled();
  });

  it("permite modificar cuando no hay pasajes vendidos y los aeropuertos son válidos", async () => {
    prismaMock.ticket.count.mockResolvedValue(0);
    prismaMock.airport.count.mockResolvedValue(2);
    prismaMock.route.update.mockResolvedValue(aRoute);

    const result = await updateRoute("TRA_1", validData);

    expect(result.ok).toBe(true);
  });
});

describe("deactivateRoute", () => {
  it("bloquea la baja si el trayecto tiene pasajes vendidos", async () => {
    prismaMock.ticket.count.mockResolvedValue(1);

    const result = await deactivateRoute("TRA_1");

    expect(result.ok).toBe(false);
    expect(prismaMock.route.update).not.toHaveBeenCalled();
  });

  it("da de baja cuando no hay pasajes vendidos", async () => {
    prismaMock.ticket.count.mockResolvedValue(0);
    prismaMock.route.update.mockResolvedValue({ ...aRoute, isActive: false });

    const result = await deactivateRoute("TRA_1");

    expect(result.ok).toBe(true);
    expect(prismaMock.route.update).toHaveBeenCalledWith({
      where: { id: "TRA_1" },
      data: { isActive: false },
    });
  });
});
