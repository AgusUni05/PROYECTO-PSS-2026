import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { prismaMock } from "@/tests/prisma-mock";
import { createAirport, deactivateAirport, updateAirport } from "./service";

const validData = { code: "EZE", name: "Ezeiza", city: "Buenos Aires" };

const anAirport = {
  id: "AER_1",
  ...validData,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("createAirport", () => {
  it("rechaza un código duplicado sin llegar a crear", async () => {
    prismaMock.airport.findUnique.mockResolvedValue(anAirport);

    const result = await createAirport(validData);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.code).toBeDefined();
    expect(prismaMock.airport.create).not.toHaveBeenCalled();
  });

  it("crea el aeropuerto con id prefijado AER_ cuando el código no existe", async () => {
    prismaMock.airport.findUnique.mockResolvedValue(null);
    prismaMock.airport.create.mockResolvedValue(anAirport);

    const result = await createAirport(validData);

    expect(result.ok).toBe(true);
    expect(prismaMock.airport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: expect.stringMatching(/^AER_/), ...validData }),
    });
  });

  it("trata una colisión P2002 (carrera) como código duplicado", async () => {
    prismaMock.airport.findUnique.mockResolvedValue(null);
    prismaMock.airport.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.10.0",
      }),
    );

    const result = await createAirport(validData);

    expect(result.ok).toBe(false);
  });
});

describe("updateAirport", () => {
  it("permite guardar sin cambiar el código propio", async () => {
    prismaMock.airport.findFirst.mockResolvedValue(null);
    prismaMock.airport.update.mockResolvedValue(anAirport);

    const result = await updateAirport("AER_1", validData);

    expect(result.ok).toBe(true);
    expect(prismaMock.airport.findFirst).toHaveBeenCalledWith({
      where: { code: "EZE", NOT: { id: "AER_1" } },
    });
  });

  it("rechaza si otro aeropuerto ya usa ese código", async () => {
    prismaMock.airport.findFirst.mockResolvedValue({ ...anAirport, id: "AER_2" });

    const result = await updateAirport("AER_1", validData);

    expect(result.ok).toBe(false);
    expect(prismaMock.airport.update).not.toHaveBeenCalled();
  });
});

describe("deactivateAirport", () => {
  it("bloquea la baja si hay vuelos futuros programados", async () => {
    prismaMock.flight.count.mockResolvedValue(2);

    const result = await deactivateAirport("AER_1");

    expect(result.ok).toBe(false);
    expect(prismaMock.airport.update).not.toHaveBeenCalled();
  });

  it("da de baja (isActive: false) cuando no hay vuelos futuros", async () => {
    prismaMock.flight.count.mockResolvedValue(0);
    prismaMock.airport.update.mockResolvedValue({ ...anAirport, isActive: false });

    const result = await deactivateAirport("AER_1");

    expect(result.ok).toBe(true);
    expect(prismaMock.airport.update).toHaveBeenCalledWith({
      where: { id: "AER_1" },
      data: { isActive: false },
    });
  });
});
