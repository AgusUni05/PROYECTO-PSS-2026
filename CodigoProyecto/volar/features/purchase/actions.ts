"use server";

import { getCurrentUser } from "@/lib/auth";
import { idSchema } from "@/lib/id";
import { prisma } from "@/lib/prisma";
import { sendPurchaseConfirmationEmail } from "@/lib/mailer/purchase";
import type { ActionResult } from "@/lib/action-result";
import {
  confirmPurchaseSchema,
  passengersFormSchema,
  type ConfirmPurchaseValues,
  type PassengersFormValues,
} from "./schema";
import * as purchaseService from "./service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bookingCodeSchema, paymentFormSchema, type PaymentFormValues } from "./schema";
import type { PaymentOutcome } from "./service";

const PAYMENT_PATH = "/compra/pago";

/** US-15: confirma cantidad y clase, retiene el cupo y crea la reserva (hold de 10 minutos). */
export async function confirmPurchaseAction(
  values: ConfirmPurchaseValues,
): Promise<ActionResult<{ id: string; code: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Tenés que iniciar sesión para comprar." };

  const parsed = confirmPurchaseSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  return purchaseService.createBooking(
    { flightId: parsed.data.vuelo, seatClass: parsed.data.clase, quantity: parsed.data.cantidad },
    user,
  );
}

/**
 * US-15: vence una reserva puntual (idempotente). La llama el countdown del
 * cliente al llegar a 0 para liberar el cupo apenas se agota el tiempo, sin
 * esperar a que alguien más toque ese vuelo. Devuelve false si la reserva ya
 * se resolvió de otra forma (pagada o rechazada) y no hay que echar al usuario.
 */
export async function expireBookingAction(id: string): Promise<boolean> {
  if (!idSchema("Booking").safeParse(id).success) return false;
  return purchaseService.expireBookingIfDue(id);
}

/**
 * US-18/US-19: guarda los datos de cada pasajero de la reserva y devuelve el
 * código para pasar al pago. Los errores de formato vuelven por campo
 * ("pasajeros.2.numeroDocumento") para resaltar el pasajero exacto.
 */
export async function savePassengersAction(
  bookingId: string,
  values: PassengersFormValues,
): Promise<ActionResult<{ code: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Tenés que iniciar sesión para comprar." };

  if (!idSchema("Booking").safeParse(bookingId).success) {
    return { ok: false, error: "La reserva no es válida." };
  }

  const parsed = passengersFormSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      (fieldErrors[issue.path.join(".")] ??= []).push(issue.message);
    }
    return { ok: false, error: "Revisá los datos de los pasajeros.", fieldErrors };
  }

  return purchaseService.savePassengers(bookingId, user.id, parsed.data.pasajeros);
}

export async function processPaymentAction(
  bookingCode: string,
  values: PaymentFormValues,
): Promise<ActionResult<PaymentOutcome>> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const parsedCode = bookingCodeSchema.safeParse(bookingCode);
  if (!parsedCode.success) return { ok: false, error: "Código de reserva inválido" };

  const parsed = paymentFormSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await purchaseService.processPayment(parsedCode.data, parsed.data, user.id);

  if (result.ok) {
    revalidatePath(PAYMENT_PATH);

    // El pago ya está confirmado: el correo es best-effort y nunca debe
    // convertir una compra exitosa en un error para el pasajero. Si falla,
    // la fila queda PENDING/FAILED y `pnpm mail:send` puede reintentarla.
    if (result.data.status === "APPROVED") {
      try {
        const notification = await prisma.emailNotification.findFirst({
          where: {
            type: "PURCHASE_CONFIRMATION",
            status: "PENDING",
            booking: { code: result.data.bookingCode },
          },
          orderBy: { createdAt: "desc" },
        });

        if (notification) {
          await sendPurchaseConfirmationEmail(notification, result.data.bookingCode);
        }
      } catch (error) {
        console.error("No se pudo enviar la confirmación de compra:", error);
      }
    }
  }

  return result;
}