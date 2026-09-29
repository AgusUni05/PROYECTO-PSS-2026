import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { prismaMock } from "@/tests/prisma-mock";
import { createAirplane, deactivateAirplane, updateAirplane } from "./service";

const validData = {
  identifier: "LV-ARG01",
  model: "Boeing 737-800",
  economySeats: 150,
  firstClassSeats: 16,
};

const anAirplane = { id: "AVI_1", ...validData, isActive: true, createdAt: new Date(), updatedAt: new Date() };

describe("createAirplane", () => {
  it("rechaza un identificador duplicado", async () => {
    prismaMock.airplane.findUnique.mockResolvedValue(anAirplane);

    const result = await createAirplane(validData);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors?.identifier).toBeDefined();
    expect(prismaMock.airplane.create).not.toHaveBeenCalled();
  });

  it("crea el avión con id prefijado AVI_", async () => {
    prismaMock.airplane.findUnique.mockResolvedValue(null);
    prismaMock.airplane.create.mockResolvedValue(anAirplane);

    const result = await createAirplane(validData);

    expect(result.ok).toBe(true);
    expect(prismaMock.airplane.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: expect.stringMatching(/^AVI_/), ...validData }),
    });
  });

  it("trata una colisión P2002 como identificador duplicado", async () => {
    prismaMock.airplane.findUnique.mockResolvedValue(null);
    prismaMock.airplane.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.10.0",
      }),
    );

    const result = await createAirplane(validData);

    expect(result.ok).toBe(false);
  });
});

describe("updateAirplane", () => {
  it("rechaza reducir la capacidad por debajo de lo ya vendido en un vuelo futuro", async () => {
    prismaMock.airplane.findFirst.mockResolvedValue(null);
    prismaMock.flight.findFirst.mockResolvedValue({ code: "VU-20261010-01" } as never);

    const result = await updateAirplane("AVI_1", { ...validData, economySeats: 10 });

    expect(result.ok).toBe(false);
    expect(prismaMock.airplane.update).not.toHaveBeenCalled();
  });

  it("permite la modificación cuando no hay ventas que superen la nueva capacidad", async () => {
    prismaMock.airplane.findFirst.mockResolvedValue(null);
    prismaMock.flight.findFirst.mockResolvedValue(null);
    prismaMock.airplane.update.mockResolvedValue(anAirplane);

    const result = await updateAirplane("AVI_1", validData);

    expect(result.ok).toBe(true);
  });

  it("rechaza si otro avión ya usa ese identificador", async () => {
    prismaMock.airplane.findFirst.mockResolvedValue({ ...anAirplane, id: "AVI_2" });

    const result = await updateAirplane("AVI_1", validData);

    expect(result.ok).toBe(false);
    expect(prismaMock.flight.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.airplane.update).not.toHaveBeenCalled();
  });
});

describe("deactivateAirplane", () => {
  it("bloquea la baja si hay vuelos futuros asignados", async () => {
    prismaMock.flight.count.mockResolvedValue(3);

    const result = await deactivateAirplane("AVI_1");

    expect(result.ok).toBe(false);
    expect(prismaMock.airplane.update).not.toHaveBeenCalled();
  });

  it("da de baja cuando no tiene vuelos futuros", async () => {
    prismaMock.flight.count.mockResolvedValue(0);
    prismaMock.airplane.update.mockResolvedValue({ ...anAirplane, isActive: false });

    const result = await deactivateAirplane("AVI_1");

    expect(result.ok).toBe(true);
    expect(prismaMock.airplane.update).toHaveBeenCalledWith({
      where: { id: "AVI_1" },
      data: { isActive: false },
    });
  });
});
