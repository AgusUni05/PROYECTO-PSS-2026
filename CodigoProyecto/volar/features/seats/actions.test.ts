import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./service", () => ({ chooseSeats: vi.fn() }));

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { newId } from "@/lib/id";
import { chooseSeatsAction } from "./actions";
import { chooseSeats } from "./service";

const user = { id: "USU_SESION", isActive: true };
const ticketId = newId("Ticket");
const flightId = newId("Flight");
const valid = { reserva: "demo0001", vuelo: flightId, asientos: [{ pasaje: ticketId, asiento: "7C" }] };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(user as never);
  vi.mocked(chooseSeats).mockResolvedValue({ ok: true, data: { changed: 1 } });
});

describe("chooseSeatsAction (US-37)", () => {
  it("sin sesión no cambia asientos", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    expect(await chooseSeatsAction(valid)).toEqual({
      ok: false,
      error: "Tenés que iniciar sesión para elegir asientos.",
    });
    expect(chooseSeats).not.toHaveBeenCalled();
  });

  it("con la cuenta desactivada no cambia asientos", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ ...user, isActive: false } as never);

    expect((await chooseSeatsAction(valid)).ok).toBe(false);
    expect(chooseSeats).not.toHaveBeenCalled();
  });

  it("rechaza un asiento con formato inválido", async () => {
    const result = await chooseSeatsAction({ ...valid, asientos: [{ pasaje: ticketId, asiento: "7Z" }] });

    expect(result).toEqual({ ok: false, error: "Asiento inválido." });
    expect(chooseSeats).not.toHaveBeenCalled();
  });

  it("usa el usuario de la sesión y el código normalizado, y refresca las pantallas", async () => {
    const result = await chooseSeatsAction(valid);

    expect(result).toEqual({ ok: true, data: { changed: 1 } });
    expect(chooseSeats).toHaveBeenCalledWith("DEMO0001", "USU_SESION", flightId, [
      { ticketId, seat: "7C" },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/compra/checkin");
    expect(revalidatePath).toHaveBeenCalledWith("/cuenta");
  });

  it("sin cambios no refresca nada", async () => {
    vi.mocked(chooseSeats).mockResolvedValue({ ok: true, data: { changed: 0 } });

    await chooseSeatsAction(valid);

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
