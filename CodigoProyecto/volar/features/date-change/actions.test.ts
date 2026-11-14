import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./service", () => ({ changeBookingDate: vi.fn() }));

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { newId } from "@/lib/id";
import { changeBookingAction } from "./actions";
import { changeBookingDate } from "./service";

const flightId = newId("Flight");
const valid = {
  reserva: "gnq47m",
  vuelo: flightId,
  aceptacion: true as const,
  medioPago: "CREDIT" as const,
  numeroTarjeta: "4111 1111 1111 1112",
  titular: "Franco Laza",
  vencimiento: "12/28",
  cvv: "123",
  cuotas: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "USU_SESION", isActive: true } as never);
  vi.mocked(changeBookingDate).mockResolvedValue({
    ok: true,
    data: { flightCode: "VU-20261123-002", total: "9750.00", transactionId: "TX-1" },
  });
});

describe("changeBookingAction (US-39, cambio de fecha)", () => {
  it("sin sesión no cambia la reserva", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    expect(await changeBookingAction(valid)).toEqual({
      ok: false,
      error: "Tenés que iniciar sesión para cambiar la reserva.",
    });
    expect(changeBookingDate).not.toHaveBeenCalled();
  });

  it("valida los datos de la tarjeta por campo", async () => {
    const result = await changeBookingAction({ ...valid, numeroTarjeta: "4111" });

    expect(result).toMatchObject({ ok: false, fieldErrors: { numeroTarjeta: ["El número debe tener 16 dígitos"] } });
    expect(changeBookingDate).not.toHaveBeenCalled();
  });

  it("exige aceptar la política de penalidades", async () => {
    const result = await changeBookingAction({ ...valid, aceptacion: false as never });

    expect(result).toMatchObject({ ok: false, error: "Aceptá los términos de la política de penalidades." });
    expect(changeBookingDate).not.toHaveBeenCalled();
  });

  it("delega con el código normalizado, el usuario de la sesión, el vuelo y la tarjeta, y refresca", async () => {
    const result = await changeBookingAction(valid);

    expect(changeBookingDate).toHaveBeenCalledWith(
      "GNQ47M",
      "USU_SESION",
      flightId,
      expect.objectContaining({ numeroTarjeta: "4111111111111112", cuotas: 1 }),
    );
    expect(result.ok).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/cuenta");
  });

  it("si el servicio rechaza, devuelve su error sin refrescar", async () => {
    vi.mocked(changeBookingDate).mockResolvedValue({ ok: false, error: "El pago fue rechazado." });

    expect(await changeBookingAction(valid)).toEqual({ ok: false, error: "El pago fue rechazado." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
