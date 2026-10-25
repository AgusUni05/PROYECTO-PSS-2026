import { Prisma } from "@/generated/prisma/client";
import type { SeatClass } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/id";
import type { ActionResult } from "@/lib/action-result";
import { availableSeats, isOnSale } from "@/features/flights/availability";
import { issueComprobantes } from "@/features/purchase/issuance";
import { newBookingCode, newTransactionId } from "@/features/purchase/service";
import type { PassengerValues } from "@/features/purchase/schema";
import type { CounterPaymentMethod } from "./schema";

type Seller = { id: string };

type CounterSaleInput = {
  flightId: string;
  seatClass: SeatClass;
  metodoPago: CounterPaymentMethod;
  contactEmail: string;
  pasajeros: PassengerValues[];
};

const COUNTER_PAYMENT_GATEWAY_LABEL: Record<CounterPaymentMethod, string> = {
  CASH: "Mostrador — Efectivo",
  POS: "Mostrador — POS",
};

/**
 * US-33: venta presencial en mostrador. A diferencia de la compra web
 * (US-15/US-17/US-20/US-21), no hay hold de 10 minutos ni pasarela que pueda
 * rechazar el pago: el empleado y el pasajero están presentes y el cobro ya
 * ocurrió físicamente. Reserva el cupo de forma atómica (misma técnica que
 * `createBooking`), crea la reserva ya CONFIRMED, registra el pago y emite
 * pasajes y factura con `issueComprobantes` (US-23/US-24), todo en una sola
 * transacción.
 */
export async function createCounterSale(
  input: CounterSaleInput,
  seller: Seller,
): Promise<ActionResult<{ code: string }>> {
  const quantity = input.pasajeros.length;
  const now = new Date();

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
  if (quantity > available) {
    return {
      ok: false,
      error:
        available === 0
          ? "No quedan cupos disponibles en esta clase."
          : `Solo quedan ${available} cupo(s) disponibles en esta clase.`,
      fieldErrors: { pasajeros: [`Quedan ${available} cupo(s) disponibles`] },
    };
  }

  const bookingId = newId("Booking");
  const code = newBookingCode();
  const totalAmount = new Prisma.Decimal(fare).times(quantity);
  const maxOccupiedAllowed = capacity - quantity;
  const titular = input.pasajeros[0];
  const contactName = `${titular.apellido}, ${titular.nombre}`;

  try {
    await prisma.$transaction(async (tx) => {
      const { count } =
        input.seatClass === "ECONOMY"
          ? await tx.flight.updateMany({
              where: { id: flight.id, economyOccupied: { lte: maxOccupiedAllowed } },
              data: { economyOccupied: { increment: quantity } },
            })
          : await tx.flight.updateMany({
              where: { id: flight.id, firstClassOccupied: { lte: maxOccupiedAllowed } },
              data: { firstClassOccupied: { increment: quantity } },
            });
      if (count === 0) throw new Error("NO_SEATS");

      await tx.booking.create({
        data: {
          id: bookingId,
          code,
          flightId: flight.id,
          seatClass: input.seatClass,
          quantity,
          unitPrice: fare,
          totalAmount,
          status: "CONFIRMED",
          holdExpiresAt: now,
          channel: "COUNTER",
          sellerId: seller.id,
          contactEmail: input.contactEmail,
          contactName,
          confirmedAt: now,
        },
      });

      const tickets = input.pasajeros.map((p) => ({
        id: newId("Ticket"),
        bookingId,
        flightId: flight.id,
        seatClass: input.seatClass,
        unitPrice: fare,
        firstName: p.nombre,
        lastName: p.apellido,
        documentType: p.tipoDocumento,
        documentNumber: p.numeroDocumento,
        status: "PENDING" as const,
      }));
      await tx.ticket.createMany({ data: tickets });

      await tx.payment.create({
        data: {
          id: newId("Payment"),
          bookingId,
          amount: totalAmount,
          status: "APPROVED",
          gateway: COUNTER_PAYMENT_GATEWAY_LABEL[input.metodoPago],
          transactionId: newTransactionId(),
          processedAt: now,
        },
      });

      await issueComprobantes(
        tx,
        {
          id: bookingId,
          code,
          flightId: flight.id,
          seatClass: input.seatClass,
          contactName,
          contactEmail: input.contactEmail,
          totalAmount,
          flight: {
            code: flight.code,
            economyCapacity: flight.economyCapacity,
            firstClassCapacity: flight.firstClassCapacity,
          },
          tickets: tickets.map((t) => ({
            id: t.id,
            firstName: t.firstName,
            lastName: t.lastName,
            unitPrice: t.unitPrice,
          })),
        },
        now,
      );
    });
  } catch (err) {
    if (err instanceof Error && err.message === "NO_SEATS") {
      return {
        ok: false,
        error: "Se agotaron los cupos de esta clase justo ahora. Ajustá la cantidad o elegí otra opción.",
      };
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "No se pudo registrar la venta. Volvé a intentarlo." };
    }
    throw err;
  }

  return { ok: true, data: { code } };
}
