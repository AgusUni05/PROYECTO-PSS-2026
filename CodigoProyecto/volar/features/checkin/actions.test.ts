import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./service", () => ({ checkInPassengers: vi.fn() }));

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { newId } from "@/lib/id";
import { checkInAction } from "./actions";
import { checkInPassengers } from "./service";

const user = { id: "USU_SESION", isActive: true };
const ticketId = newId("Ticket");
const valid = { reserva: "demo0001", pasajes: [ticketId], declaracion: true as const };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(user as never);
  vi.mocked(checkInPassengers).mockResolvedValue({ ok: true, data: { checkedIn: 1 } });
});

describe("checkInAction (US-38)", () => {
  it("sin sesión no hace el check-in", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await checkInAction(valid);

    expect(result).toEqual({ ok: false, error: "Tenés que iniciar sesión para hacer el check-in." });
    expect(checkInPassengers).not.toHaveBeenCalled();
  });

  it("con la cuenta desactivada no hace el check-in", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ ...user, isActive: false } as never);

    const result = await checkInAction(valid);

    expect(result.ok).toBe(false);
    expect(checkInPassengers).not.toHaveBeenCalled();
  });

  it("exige aceptar la declaración de mercancías peligrosas", async () => {
    const result = await checkInAction({ ...valid, declaracion: false as never });

    expect(result).toMatchObject({
      ok: false,
      error: "Confirmá la declaración de mercancías peligrosas.",
    });
    expect(checkInPassengers).not.toHaveBeenCalled();
  });

  it("exige al menos un pasajero", async () => {
    const result = await checkInAction({ ...valid, pasajes: [] });

    expect(result).toMatchObject({ ok: false, error: "Elegí al menos un pasajero." });
    expect(checkInPassengers).not.toHaveBeenCalled();
  });

  it("rechaza ids de pasaje con formato inválido", async () => {
    const result = await checkInAction({ ...valid, pasajes: ["../otra-cosa"] });

    expect(result.ok).toBe(false);
    expect(checkInPassengers).not.toHaveBeenCalled();
  });

  it("delega con el código normalizado y el usuario de la sesión, y refresca las pantallas", async () => {
    const result = await checkInAction(valid);

    expect(checkInPassengers).toHaveBeenCalledWith("DEMO0001", "USU_SESION", [ticketId]);
    expect(result).toEqual({ ok: true, data: { checkedIn: 1 } });
    expect(revalidatePath).toHaveBeenCalledWith("/compra/checkin");
    expect(revalidatePath).toHaveBeenCalledWith("/cuenta");
  });

  it("si el servicio rechaza, devuelve su error sin refrescar", async () => {
    vi.mocked(checkInPassengers).mockResolvedValue({ ok: false, error: "El check-in de este vuelo ya cerró." });

    const result = await checkInAction(valid);

    expect(result).toEqual({ ok: false, error: "El check-in de este vuelo ya cerró." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
