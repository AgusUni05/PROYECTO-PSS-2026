import { z } from "zod";
import { SeatClass } from "@/generated/prisma/enums";
import { idSchema } from "@/lib/id";

// US-14: selección con la que se inicia la compra desde un resultado de
// búsqueda (/compra?vuelo=…&clase=…). Viene por URL, así que se valida siempre.
export const purchaseSelectionSchema = z.object({
  vuelo: idSchema("Flight"),
  clase: z.enum(SeatClass, { error: "Clase inválida" }),
});

export type PurchaseSelection = z.infer<typeof purchaseSelectionSchema>;

// US-20: medio de pago y planes de financiación ofrecidos (pago_comprobantes.html).
export const PAYMENT_METHODS = ["CREDIT", "DEBIT"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const INSTALLMENT_PLANS = [1, 3, 6] as const;
export type InstallmentPlan = (typeof INSTALLMENT_PLANS)[number];

/** US-20: importe de cada cuota, sin recargo (el total en partes iguales). */
export function installmentAmount(total: number, installments: InstallmentPlan): number {
  return total / installments;
}

// US-20: el número puede venir con espacios o guiones; se normaliza y se exigen
// 16 dígitos (a diferencia del CVV, nunca se persiste: RNF-08).
const cardNumberField = z
  .string({ error: "Ingresá el número de tarjeta" })
  .transform((value) => value.replace(/[\s-]+/g, ""))
  .refine((value) => /^\d{16}$/.test(value), "El número debe tener 16 dígitos");

const cardHolderField = z
  .string({ error: "Ingresá el nombre del titular" })
  .trim()
  .min(5, "Ingresá nombre y apellido del titular")
  .max(60, "El nombre es demasiado largo")
  .regex(
    /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '.-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/,
    "El nombre solo puede tener letras",
  );

/** Vencimiento MM/AA ya pasado respecto del mes actual (UTC). */
function isExpired(expiry: string, now: Date): boolean {
  const [month, year] = expiry.split("/").map(Number);
  const currentYear = now.getUTCFullYear() % 100;
  const currentMonth = now.getUTCMonth() + 1;
  return year < currentYear || (year === currentYear && month < currentMonth);
}

const expiryField = z
  .string({ error: "Ingresá el vencimiento" })
  .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Usá el formato MM/AA")
  .refine((value) => !isExpired(value, new Date()), "La tarjeta está vencida");

const installmentsField = z.coerce
  .number({ error: "Seleccioná el plan de cuotas" })
  .refine(
    (value): value is InstallmentPlan => (INSTALLMENT_PLANS as readonly number[]).includes(value),
    "Plan de cuotas inválido",
  );

// US-20: datos de pago del comprador. No incluye el código de reserva (viaja
// aparte) y no se persiste ningún campo de la tarjeta (RNF-08).
export const paymentFormSchema = z.object({
  medioPago: z.enum(PAYMENT_METHODS, { error: "Seleccioná el medio de pago" }),
  numeroTarjeta: cardNumberField,
  titular: cardHolderField,
  vencimiento: expiryField,
  cvv: z
    .string({ error: "Ingresá el código de seguridad" })
    .regex(/^\d{3,4}$/, "El CVV tiene 3 o 4 dígitos"),
  cuotas: installmentsField,
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;
