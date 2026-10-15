"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { bookingCodeSchema, paymentFormSchema, type PaymentFormValues } from "./schema";
import * as purchaseService from "./service";
import type { PaymentOutcome } from "./service";

const PAYMENT_PATH = "/compra/pago";

/**
 * US-20/US-21: valida los datos de pago y los procesa contra la pasarela
 * simulada. Requiere sesión (el flujo de compra pide cuenta desde US-14); no
 * valida titularidad de la reserva todavía (eso llega con US-34).
 */
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

  const result = await purchaseService.processPayment(parsedCode.data, parsed.data);
  if (result.ok) revalidatePath(PAYMENT_PATH);
  return result;
}
