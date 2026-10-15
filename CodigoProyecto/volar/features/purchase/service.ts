import { randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import type { SeatClass } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/id";
import type { ActionResult } from "@/lib/action-result";
import { availableSeats, isOnSale } from "@/features/flights/availability";
import { randomUUID } from "node:crypto";
import type { BookingStatus } from "@/generated/prisma/enums";
import type { PaymentFormValues } from "./schema";
import { isHoldExpired } from "./queries";
import { issueComprobantes } from "./issuance";

/** US-15/US-17: minutos que se retiene el cupo esperando el pago. */
export const HOLD_MINUTES = 10;

// Alfabeto sin 0/O/1/I para que el código de reserva no se confunda al leerlo.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newBookingCode(): string {
  const bytes = randomBytes(6);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

type ExpirableBooking = {
  id: string;
  flightId: string;
  seatClass: SeatClass;
  quantity: number;
};

/** Pasa la reserva a EXPIRED y libera el cupo que tenía retenido. Asume que ya está vencida. */
async function expirePendingBooking(
  tx: Prisma.TransactionClient,
  booking: ExpirableBooking,
): Promise<boolean> {
  const { count } = await tx.booking.updateMany({
    where: { id: booking.id, status: "PENDING_PAYMENT" },
    data: { status: "EXPIRED" },
  });
  if (count === 0) return false; // otra request ya la resolvió (pago o expiración)

  if (booking.seatClass === "ECONOMY") {
    await tx.flight.update({
      where: { id: booking.flightId },
      data: { economyOccupied: { decrement: booking.quantity } },
    });
  } else {
    await tx.flight.update({
      where: { id: booking.flightId },
      data: { firstClassOccupied: { decrement: booking.quantity } },
    });
  }
  return true;
}

/**
 * US-15/US-17: libera en caliente las retenciones vencidas de un vuelo antes
 * de evaluar su cupo. No depende de un job en segundo plano: se llama antes
 * de reservar cupo nuevo en ese vuelo.
 */
export async function releaseExpiredHoldsForFlight(
  flightId: string,
  now = new Date(),
): Promise<void> {
  const expired = await prisma.booking.findMany({
    where: { flightId, status: "PENDING_PAYMENT", holdExpiresAt: { lt: now } },
    select: { id: true, flightId: true, seatClass: true, quantity: true },
  });
  if (expired.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const booking of expired) await expirePendingBooking(tx, booking);
  });
}

/**
 * US-15: vence puntualmente una reserva si ya pasó su holdExpiresAt
 * (idempotente). La llama tanto la pantalla de reserva al cargar como el
 * countdown del cliente al llegar a 0. Devuelve true si quedó (o ya estaba) vencida.
 */
export async function expireBookingIfDue(id: string, now = new Date()): Promise<boolean> {
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { id: true, flightId: true, seatClass: true, quantity: true, status: true, holdExpiresAt: true },
  });
  if (!booking) return false;
  if (booking.status !== "PENDING_PAYMENT") return booking.status === "EXPIRED";
  if (booking.holdExpiresAt > now) return false;

  await prisma.$transaction(async (tx) => {
    await expirePendingBooking(tx, booking);
  });
  return true;
}

type Buyer = { id: string; email: string; firstName: string; lastName: string };

/**
 * US-15/US-17: confirma cantidad y clase. Verifica cupo y lo retiene de forma
 * atómica (update condicional sobre el ocupado leído, re-chequeado dentro de
 * la transacción para no pisarse con otra compra concurrente) y crea la
 * reserva con status PENDING_PAYMENT y un hold de 10 minutos (US-15/US-17).
 */
export async function createBooking(
  input: { flightId: string; seatClass: SeatClass; quantity: number },
  buyer: Buyer,
): Promise<ActionResult<{ id: string; code: string }>> {
  const now = new Date();
  await releaseExpiredHoldsForFlight(input.flightId, now);

  const flight = await prisma.flight.findUnique({
    where: { id: input.flightId },
    include: { salesPeriod: { select: { startDate: true, endDate: true } } },
  });
  if (!flight || !isOnSale(flight, now)) {
    return { ok: false, error: "Este vuelo ya no está disponible para la venta." };
  }

  const capacity = input.seatClass === "ECONOMY" ? flight.economyCapacity : flight.firstClassCapacity;
  const occupied = input.seatClass === "ECONOMY" ? flight.economyOccupied : flight.firstClassOccupied;
  const fare = input.seatClass === "ECONOMY" ? flight.economyFare : flight.firstClassFare;

  const available = availableSeats(capacity, occupied);
  if (input.quantity > available) {
    return {
      ok: false,
      error:
        available === 0
          ? "No quedan cupos disponibles en esta clase."
          : `Solo quedan ${available} cupo(s) disponibles en esta clase.`,
      fieldErrors: { cantidad: [`Quedan ${available} cupo(s) disponibles`] },
    };
  }

  const bookingId = newId("Booking");
  const code = newBookingCode();
  const totalAmount = new Prisma.Decimal(fare).times(input.quantity);
  const holdExpiresAt = new Date(now.getTime() + HOLD_MINUTES * 60_000);
  const maxOccupiedAllowed = capacity - input.quantity;

  try {
    await prisma.$transaction(async (tx) => {
      const { count } =
        input.seatClass === "ECONOMY"
          ? await tx.flight.updateMany({
              where: { id: flight.id, economyOccupied: { lte: maxOccupiedAllowed } },
              data: { economyOccupied: { increment: input.quantity } },
            })
          : await tx.flight.updateMany({
              where: { id: flight.id, firstClassOccupied: { lte: maxOccupiedAllowed } },
              data: { firstClassOccupied: { increment: input.quantity } },
            });
      if (count === 0) throw new Error("NO_SEATS");

      await tx.booking.create({
        data: {
          id: bookingId,
          code,
          flightId: flight.id,
          seatClass: input.seatClass,
          quantity: input.quantity,
          unitPrice: fare,
          totalAmount,
          status: "PENDING_PAYMENT",
          holdExpiresAt,
          channel: "WEB",
          buyerId: buyer.id,
          contactEmail: buyer.email,
          contactName: `${buyer.firstName} ${buyer.lastName}`,
        },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "NO_SEATS") {
      return {
        ok: false,
        error: "Se agotaron los cupos de esta clase justo ahora. Ajustá la cantidad o elegí otra opción.",
      };
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "No se pudo generar la reserva. Volvé a intentarlo." };
    }
    throw err;
  }

  return { ok: true, data: { id: bookingId, code } };
}

export type BookingHold = {
  id: string;
  code: string;
  status: "PENDING_PAYMENT" | "CONFIRMED" | "EXPIRED" | "REJECTED" | "CANCELLED";
  seatClass: SeatClass;
  quantity: number;
  unitPrice: string;
  totalAmount: string;
  holdExpiresAt: Date;
  flight: {
    code: string;
    date: Date;
    departureAt: Date;
    arrivalAt: Date;
    origin: { id: string; code: string; city: string };
    destination: { id: string; code: string; city: string };
  };
};

/**
 * US-15: estado actual de una reserva para la pantalla de "hold" (resumen +
 * countdown). Vence la reserva en caliente si corresponde antes de leerla.
 * `null` si no existe o no pertenece al comprador.
 */
export async function getBookingHold(id: string, buyerId: string): Promise<BookingHold | null> {
  await expireBookingIfDue(id);

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      flight: {
        select: {
          code: true,
          date: true,
          departureAt: true,
          arrivalAt: true,
          route: {
            select: {
              origin: { select: { id: true, code: true, city: true } },
              destination: { select: { id: true, code: true, city: true } },
            },
          },
        },
      },
    },
  });
  if (!booking || booking.buyerId !== buyerId) return null;

  return {
    id: booking.id,
    code: booking.code,
    status: booking.status,
    seatClass: booking.seatClass,
    quantity: booking.quantity,
    unitPrice: booking.unitPrice.toString(),
    totalAmount: booking.totalAmount.toString(),
    holdExpiresAt: booking.holdExpiresAt,
    flight: {
      code: booking.flight.code,
      date: booking.flight.date,
      departureAt: booking.flight.departureAt,
      arrivalAt: booking.flight.arrivalAt,
      origin: booking.flight.route.origin,
      destination: booking.flight.route.destination,
    },
  };
}

// Nombre de la pasarela simulada (US-21). No hay integración real: el
// resultado se deriva de la tarjeta, ver simulateGateway.
const GATEWAY = "VolarPay (simulada)";
const REJECTION_REASON = "Fondos insuficientes o límite de tarjeta excedido";

export type PaymentOutcome = {
  status: "APPROVED" | "REJECTED";
  transactionId: string;
  bookingCode: string;
  rejectionReason: string | null;
};

/** US-20/RNF-08: marca según el primer dígito. El número completo se descarta. */
export function cardBrand(cardNumber: string): string {
  switch (cardNumber[0]) {
    case "4":
      return "VISA";
    case "5":
      return "MASTERCARD";
    case "3":
      return "AMEX";
    default:
      return "OTRA";
  }
}

/**
 * US-21: pasarela simulada. Aprueba si el último dígito de la tarjeta es par y
 * rechaza si es impar (permite probar ambos casos de forma determinista). El
 * id de transacción se genera igual que lo haría la pasarela real.
 */
function simulateGateway(cardNumber: string): { approved: boolean; transactionId: string } {
  return {
    approved: Number(cardNumber.slice(-1)) % 2 === 0,
    transactionId: `TX-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
  };
}

function notPayableMessage(status: BookingStatus): string {
  switch (status) {
    case "CONFIRMED":
      return "La reserva ya fue pagada y confirmada.";
    case "REJECTED":
      return "El pago de esta reserva fue rechazado. Reiniciá la compra para volver a intentarlo.";
    case "EXPIRED":
      return "La reserva venció. Reiniciá la compra.";
    case "CANCELLED":
      return "La reserva fue cancelada.";
    default:
      return "La reserva no se puede pagar.";
  }
}

/**
 * US-20/US-21/US-22: procesa el pago de una reserva con la pasarela simulada y
 * registra el intento. Aprobado: la compra pasa a CONFIRMED (los cupos, ya
 * retenidos como hold, quedan vendidos) y US-23 emite los comprobantes.
 * Rechazado: la compra pasa a REJECTED, se libera el cupo retenido y se
 * cancelan los pasajes. Nunca se persisten datos sensibles de la tarjeta
 * (RNF-08): solo la marca y los últimos 4 dígitos.
 */
export async function processPayment(
  code: string,
  values: PaymentFormValues,
): Promise<ActionResult<PaymentOutcome>> {
  const booking = await prisma.booking.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      status: true,
      holdExpiresAt: true,
      quantity: true,
      totalAmount: true,
      flightId: true,
      seatClass: true,
      contactName: true,
      contactEmail: true,
      flight: { select: { code: true, economyCapacity: true, firstClassCapacity: true } },
      tickets: {
        orderBy: { createdAt: "asc" },
        select: { id: true, firstName: true, lastName: true, unitPrice: true },
      },
    },
  });

  if (!booking) return { ok: false, error: "No encontramos la reserva indicada." };
  if (booking.status !== "PENDING_PAYMENT") {
    return { ok: false, error: notPayableMessage(booking.status) };
  }

  const now = new Date();
  if (isHoldExpired(booking.holdExpiresAt, now)) {
    return {
      ok: false,
      error: "La reserva venció (la retención de cupo dura 10 minutos). Volvé a iniciar la compra.",
    };
  }

  const cardNumber = values.numeroTarjeta.replace(/\D/g, "");
  const { approved, transactionId } = simulateGateway(cardNumber);
  const status = approved ? "APPROVED" : "REJECTED";

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          id: newId("Payment"),
          bookingId: booking.id,
          amount: booking.totalAmount,
          status,
          gateway: GATEWAY,
          transactionId,
          cardBrand: cardBrand(cardNumber),
          cardLast4: cardNumber.slice(-4),
          rejectionReason: approved ? null : REJECTION_REASON,
          processedAt: now,
        },
      });

      const { count } = await tx.booking.updateMany({
        where: { id: booking.id, status: "PENDING_PAYMENT", holdExpiresAt: { gt: now } },
        data: approved ? { status: "CONFIRMED", confirmedAt: now } : { status: "REJECTED" },
      });
      if (count === 0) throw new Error("BOOKING_CHANGED");

      // US-21: el rechazo no procesa la compra: cancela los pasajes y libera el
      // cupo retenido. La aprobación no toca los contadores (los asientos ya
      // estaban retenidos por el hold y pasan a vendidos) y dispara la emisión
      // de los comprobantes (US-23/US-24).
      if (!approved) {
        await tx.ticket.updateMany({
          where: { bookingId: booking.id, status: "PENDING" },
          data: { status: "CANCELLED" },
        });
        await tx.flight.updateMany({
          where:
            booking.seatClass === "ECONOMY"
              ? { id: booking.flightId, economyOccupied: { gte: booking.quantity } }
              : { id: booking.flightId, firstClassOccupied: { gte: booking.quantity } },
          data:
            booking.seatClass === "ECONOMY"
              ? { economyOccupied: { decrement: booking.quantity } }
              : { firstClassOccupied: { decrement: booking.quantity } },
        });
      } else {
        await issueComprobantes(tx, booking, now);
      }
    });
  } catch (error) {
    // El guard de concurrencia (updateMany con count 0) señala que otro proceso
    // cambió la reserva entre la lectura y la escritura: eso sí es una carrera.
    if (error instanceof Error && error.message === "BOOKING_CHANGED") {
      return {
        ok: false,
        error: "La reserva cambió mientras se procesaba el pago. Volvé a intentarlo.",
      };
    }

    // Cualquier otro fallo viene de la transacción misma (p.ej. la emisión de
    // comprobantes de US-23/24), no de una carrera: no le mentimos al usuario.
    console.error("Fallo al procesar el pago de", code, error);
    return {
      ok: false,
      error: "No pudimos completar la compra. Volvé a intentarlo en unos minutos.",
    };
  }

  return {
    ok: true,
    data: {
      status,
      transactionId,
      bookingCode: code,
      rejectionReason: approved ? null : REJECTION_REASON,
    },
  };
}
