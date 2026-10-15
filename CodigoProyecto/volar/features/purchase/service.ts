import { randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import type { SeatClass } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/id";
import type { ActionResult } from "@/lib/action-result";
import { availableSeats, isOnSale } from "@/features/flights/availability";

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
