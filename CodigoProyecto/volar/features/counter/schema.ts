import { z } from "zod";
import { SeatClass } from "@/generated/prisma/enums";
import { idSchema } from "@/lib/id";
import { passengerSchema } from "@/features/purchase/schema";

export const COUNTER_PAYMENT_METHODS = ["CASH", "POS"] as const;
export type CounterPaymentMethod = (typeof COUNTER_PAYMENT_METHODS)[number];

export const COUNTER_PAYMENT_METHOD_LABELS: Record<CounterPaymentMethod, string> = {
  CASH: "Efectivo en caja",
  POS: "POS - Tarjeta física",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// US-33: venta presencial en mostrador. Mismas reglas que la compra web (1 a 9
// pasajes, una sola clase para todo el grupo), resueltas en un solo paso: el
// cobro ya ocurrió físicamente, así que no hay cantidad separada de pasajeros
// (la cantidad es la cantidad de pasajeros cargados) ni hold de 10 minutos.
export const counterSaleSchema = z.object({
  flightId: idSchema("Flight"),
  seatClass: z.enum(SeatClass, { error: "Clase inválida" }),
  metodoPago: z.enum(COUNTER_PAYMENT_METHODS, { error: "Seleccioná el medio de cobro" }),
  // Opcional: si no se completa, no se envían comprobantes por email (RF-09
  // sigue cumpliéndose igual para la compra web, donde el email es obligatorio).
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((value) => value ?? "")
    .refine((value) => value === "" || EMAIL_PATTERN.test(value), "Ingresá un email válido"),
  pasajeros: z
    .array(passengerSchema)
    .min(1, "Agregá al menos un pasajero")
    .max(9, "Máximo 9 pasajes por transacción"),
});

export type CounterSaleValues = z.infer<typeof counterSaleSchema>;

// US-34: un único criterio de búsqueda cubre DNI, apellido o código de
// reserva (features/counter/queries.ts busca las tres cosas a la vez).
export const reservationSearchSchema = z.object({
  criterio: z.string().trim().min(1, "Ingresá un DNI, apellido o código de reserva").max(60),
});

export type ReservationSearchValues = z.infer<typeof reservationSearchSchema>;
