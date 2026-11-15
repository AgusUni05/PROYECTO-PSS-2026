import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./service", () => ({ cancelBookingVoluntarily: vi.fn() }));

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { cancelBookingAction } from "./actions";
import { cancelBookingVoluntarily } from "./service";

const valid = { reserva: "gnq47m", motivo: "imprevisto" as const, confirmacion: true as const };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "USU_SESION", isActive: true } as never);
  vi.mocked(cancelBookingVoluntarily).mockResolvedValue({
    ok: true,
    data: { cancelled: 1, penalty: "9000.00", refund: "36000.00" },
  });
});

describe("cancelBookingAction (US-39)", () => {
  it("sin sesión no cancela", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    expect(await cancelBookingAction(valid)).toEqual({
      ok: false,
      error: "Tenés que iniciar sesión para cancelar la reserva.",
    });
    expect(cancelBookingVoluntarily).not.toHaveBeenCalled();
  });

  it("exige un motivo de la lista", async () => {
    const result = await cancelBookingAction({ ...valid, motivo: "otro" as never });

    expect(result).toMatchObject({ ok: false, error: "Elegí el motivo de la cancelación." });
    expect(cancelBookingVoluntarily).not.toHaveBeenCalled();
  });

  it("exige confirmar que la cancelación es irreversible", async () => {
    const result = await cancelBookingAction({ ...valid, confirmacion: false as never });

    expect(result).toMatchObject({
      ok: false,
      error: "Confirmá que entendés que la cancelación es irreversible.",
    });
    expect(cancelBookingVoluntarily).not.toHaveBeenCalled();
  });

  it("delega con el código normalizado, el usuario de la sesión y el motivo, y refresca", async () => {
    const result = await cancelBookingAction(valid);

    expect(cancelBookingVoluntarily).toHaveBeenCalledWith("GNQ47M", "USU_SESION", "imprevisto");
    expect(result.ok).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/cuenta");
  });

  it("si el servicio rechaza, devuelve su error sin refrescar", async () => {
    vi.mocked(cancelBookingVoluntarily).mockResolvedValue({ ok: false, error: "No encontramos la reserva indicada." });

    expect(await cancelBookingAction(valid)).toEqual({ ok: false, error: "No encontramos la reserva indicada." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
