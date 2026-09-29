import { describe, expect, it } from "vitest";
import { idSchema, newId } from "./id";

describe("newId", () => {
  it("antepone el prefijo de tres letras de la entidad seguido de un ULID", () => {
    const id = newId("Airport");
    expect(id).toMatch(/^AER_[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("usa un prefijo distinto por entidad", () => {
    expect(newId("Airplane")).toMatch(/^AVI_/);
    expect(newId("Route")).toMatch(/^TRA_/);
    expect(newId("User")).toMatch(/^USU_/);
  });

  it("genera IDs únicos y monótonamente crecientes", () => {
    const ids = Array.from({ length: 50 }, () => newId("Airport"));
    expect(new Set(ids).size).toBe(ids.length);
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });
});

describe("idSchema", () => {
  it("acepta un ID generado por newId para la misma entidad", () => {
    const id = newId("Airport");
    expect(idSchema("Airport").safeParse(id).success).toBe(true);
  });

  it("rechaza el ID de otra entidad", () => {
    const id = newId("Airplane");
    expect(idSchema("Airport").safeParse(id).success).toBe(false);
  });

  it("rechaza formatos arbitrarios", () => {
    expect(idSchema("Airport").safeParse("AER_no-es-un-ulid").success).toBe(false);
    expect(idSchema("Airport").safeParse("").success).toBe(false);
  });
});
