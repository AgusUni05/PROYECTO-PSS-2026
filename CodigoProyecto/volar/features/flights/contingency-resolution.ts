import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/id";
import { Prisma } from "@/generated/prisma/client";
import {
  BookingStatus,
  ContingencyResolution,
  EmailStatus,
  EmailType,
  RefundStatus,
  SeatClass,
  TicketStatus,
} from "@/generated/prisma/enums";
import {
  assignSeats,
  seatLetters,
  seatRows,
  ticketNumber,
} from "@/features/purchase/issuance";
import { availableSeats } from "./availability";
import { rebookingCandidateWhere } from "./contingency-queries";
import { volarPayRefundGateway, type RefundGateway } from "./volar-pay-gateway";

export type RefundResolutionResult =
  | {
      type: "ok";
      refundId: string;
      amount: number;
      gatewayRefundId: string;
      ticketId: string;
      resolvedAt: Date;
    }
  | {
      type: "alreadyResolved";
      resolution: "REFUND" | "REBOOK";
      resolvedAt: Date;
    }
  | { type: "notFound" }
  | { type: "conflict" };

export type ResolveRefundContext = {
  gateway?: RefundGateway;
};

/**
 * US-26: la contingencia se pudo reservar pero el pasaje ya no está emitido
 * (por ejemplo, otro token del mismo ticket lo reembolsó). Se lanza para
 * revertir la transacción completa antes de crear un Refund o mover cupo.
 */
class TicketNotIssuedError extends Error {
  constructor() {
    super("TICKET_NOT_ISSUED");
    this.name = "TicketNotIssuedError";
  }
}

/**
 * US-26: resuelve una contingencia solicitando el reembolso del pasaje.
 *
 * - Idempotente: una segunda invocación con el mismo token devuelve
 *   `alreadyResolved` sin crear un segundo reembolso.
 * - Atómico: la reserva de la fila se hace con `updateMany` condicional al
 *   estado `PENDING`, que adquiere un bloqueo de fila en PostgreSQL y evita
 *   que dos solicitudes concurrentes procesen el mismo token.
 * - El importe del reembolso es exactamente el `unitPrice` del ticket.
 * - Libera un cupo de la clase correspondiente en el vuelo original.
 * - Si después del reembolso no quedan pasajes activos en la compra, la marca
 *   como cancelada.
 */
export async function resolveRefund(
  accessToken: string,
  userContext: ResolveRefundContext = {},
): Promise<RefundResolutionResult> {
  const gateway = userContext.gateway ?? volarPayRefundGateway;

  try {
    return await prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Reservar atómicamente la fila condicionada a estado PENDING.
      const reserved = await tx.ticketContingency.updateMany({
        where: {
          accessToken,
          resolution: ContingencyResolution.PENDING,
        },
        data: {
          resolution: ContingencyResolution.REFUND,
          resolvedAt: now,
        },
      });

      if (reserved.count === 0) {
        const existing = await tx.ticketContingency.findUnique({
          where: { accessToken },
          select: { resolution: true, resolvedAt: true },
        });

        if (!existing) {
          return { type: "notFound" };
        }

        if (existing.resolution === ContingencyResolution.REFUND) {
          return {
            type: "alreadyResolved",
            resolution: "REFUND",
            resolvedAt: existing.resolvedAt!,
          };
        }

        return { type: "conflict" };
      }

      // 2. Leer la contingencia ya reservada con sus relaciones.
      const contingency = await tx.ticketContingency.findUnique({
        where: { accessToken },
        include: {
          ticket: {
            include: {
              booking: {
                include: {
                  tickets: { select: { id: true, status: true } },
                },
              },
              flight: true,
            },
          },
        },
      });

      if (!contingency) {
        return { type: "notFound" };
      }

      const { ticket } = contingency;

      // I1: dos contingencias PENDING del mismo ticket no pueden reembolsarlo dos
      // veces. Si el pasaje ya no está emitido, se revierte la reserva de esta
      // fila y no se toca Refund, ticket, vuelo ni cupo.
      if (ticket.status !== TicketStatus.ISSUED) {
        throw new TicketNotIssuedError();
      }

      const amount = Number(ticket.unitPrice);

      // 3. Simular llamada a pasarela (sin red). Se persiste el id solo si responde.
      const { gatewayRefundId } = await gateway.processRefund({
        amount,
        ticketId: ticket.id,
        contingencyId: contingency.id,
      });

      // 4. Crear el reembolso, marcar el pasaje y liberar el cupo.
      const refund = await tx.refund.create({
        data: {
          id: newId("Refund"),
          ticketId: ticket.id,
          contingencyId: contingency.id,
          amount: ticket.unitPrice,
          status: RefundStatus.COMPLETED,
          gatewayRefundId,
          processedAt: now,
        },
      });

      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: TicketStatus.REFUNDED },
      });

      const occupiedField =
        ticket.seatClass === SeatClass.FIRST ? "firstClassOccupied" : "economyOccupied";

      await tx.flight.update({
        where: { id: ticket.flightId },
        data: { [occupiedField]: { decrement: 1 } },
      });

      // I1: cualquier otro token PENDING del mismo pasaje queda resuelto con la
      // misma decisión. Así un enlace sibling ya no puede volver a actuar.
      await tx.ticketContingency.updateMany({
        where: {
          ticketId: ticket.id,
          resolution: ContingencyResolution.PENDING,
        },
        data: {
          resolution: ContingencyResolution.REFUND,
          resolvedAt: now,
        },
      });

      // 5. Si la compra se quedó sin pasajes activos, marcarla cancelada.
      const remainingActiveTickets = ticket.booking.tickets.filter(
        (t) => t.id !== ticket.id && t.status !== TicketStatus.REFUNDED && t.status !== TicketStatus.CANCELLED,
      );

      if (remainingActiveTickets.length === 0) {
        await tx.booking.update({
          where: { id: ticket.bookingId },
          data: { status: BookingStatus.CANCELLED },
        });
      }

      return {
        type: "ok",
        refundId: refund.id,
        amount,
        gatewayRefundId,
        ticketId: ticket.id,
        resolvedAt: now,
      };
    });
  } catch (error) {
    if (error instanceof TicketNotIssuedError) {
      // La transacción ya se revirtió. Se informa el estado real sin crear nada.
      const existing = await prisma.ticketContingency.findUnique({
        where: { accessToken },
        select: { resolution: true, resolvedAt: true },
      });

      if (!existing) return { type: "notFound" };

      if (existing.resolution !== ContingencyResolution.PENDING) {
        return {
          type: "alreadyResolved",
          resolution: existing.resolution,
          resolvedAt: existing.resolvedAt!,
        };
      }

      return { type: "conflict" };
    }

    throw error;
  }
}

export type RebookingConflictReason =
  | "FLIGHT_NOT_ELIGIBLE"
  | "NO_CAPACITY"
  | "NO_SEAT"
  | "TICKET_NOT_ACTIVE";

export type RebookingResolutionResult =
  | {
      type: "ok";
      ticketId: string;
      newFlightId: string;
      flightCode: string;
      seat: string;
      ticketNumber: string;
      resolvedAt: Date;
    }
  | {
      type: "alreadyResolved";
      resolution: "REFUND" | "REBOOK";
      resolvedAt: Date;
    }
  | { type: "notFound" }
  | { type: "conflict"; reason: RebookingConflictReason };

export type ResolveRebookingContext = {
  now?: Date;
};

class RebookingConflictError extends Error {
  constructor(readonly reason: RebookingConflictReason) {
    super(reason);
    this.name = "RebookingConflictError";
  }
}

class RebookingRaceError extends Error {
  constructor() {
    super("REBOOKING_RACE");
    this.name = "RebookingRaceError";
  }
}

/**
 * US-26: sufijo determinista del e-ticket reemitido, derivado de la
 * contingencia para no colisionar con el número original ni con otra
 * reprogramación del mismo pasaje.
 */
function rebookingNumberSuffix(contingencyId: string): string {
  return `R${contingencyId.split("_").at(-1)?.slice(-8) ?? contingencyId.slice(-8)}`;
}

/**
 * US-26: reprograma un pasaje afectado a otro vuelo de la misma ruta y clase.
 *
 * - Idempotente: si la contingencia ya fue resuelta devuelve `alreadyResolved`
 *   sin volver a mover el pasaje, el cupo ni la emisión.
 * - Atómico: todo ocurre dentro de `prisma.$transaction`. La contingencia se
 *   reserva con un `updateMany` condicionado a `PENDING`, que en PostgreSQL
 *   bloquea la fila y evita dos resoluciones concurrentes.
 * - El vuelo enviado por el cliente solo se acepta si sigue cumpliendo el
 *   criterio de elegibilidad (misma ruta, `SCHEDULED`, futuro y con cupo en la
 *   clase del ticket), aunque la página lo haya mostrado antes.
 * - El cupo nuevo se toma con un `updateMany` condicional (`ocupados < capacidad`),
 *   por lo que una clase llena devuelve `conflict` sin mutar el pasaje.
 * - Conserva `seatClass` y `unitPrice`: no se crea una venta, un pago ni una
 *   factura nuevos. Solo se reemite el e-ticket con vuelo, asiento, número y
 *   `issuedAt` nuevos.
 * - La confirmación de reprogramación no se envía en Sprint 3: no hay plantilla
 *   propia. La fila queda `FAILED` con un `lastError` no secreto y nunca se
 *   despacha con la plantilla de contingencia.
 */
export async function resolveRebooking(
  accessToken: string,
  newFlightId: string,
  userContext: ResolveRebookingContext = {},
): Promise<RebookingResolutionResult> {
  const now = userContext.now ?? new Date();

  try {
    return await prisma.$transaction(
      async (tx): Promise<RebookingResolutionResult> => {
        const contingency = await tx.ticketContingency.findUnique({
          where: { accessToken },
          include: {
            ticket: {
              include: {
                flight: { select: { routeId: true } },
                booking: {
                  include: {
                    tickets: {
                      select: { id: true },
                      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                    },
                  },
                },
              },
            },
          },
        });

        if (!contingency) return { type: "notFound" };

        if (contingency.resolution !== ContingencyResolution.PENDING) {
          return {
            type: "alreadyResolved",
            resolution: contingency.resolution,
            resolvedAt: contingency.resolvedAt!,
          };
        }

        const { ticket } = contingency;
        const seatClass = ticket.seatClass;

        // I1/M3: reservar la contingencia antes de bloquear el vuelo nuevo. El
        // reembolso bloquea contingencia → vuelo original; este orden evita el
        // deadlock cruzado entre ambas resoluciones.
        const reserved = await tx.ticketContingency.updateMany({
          where: { accessToken, resolution: ContingencyResolution.PENDING },
          data: {
            resolution: ContingencyResolution.REBOOK,
            newFlightId,
            resolvedAt: now,
          },
        });

        if (reserved.count === 0) throw new RebookingRaceError();

        // I1: el pasaje debe seguir emitido. Si otro token del mismo ticket ya
        // lo reembolsó, se revierte todo sin mover vuelo, asiento ni cupo.
        if (ticket.status !== TicketStatus.ISSUED) {
          throw new TicketNotIssuedError();
        }

        const candidate = await tx.flight.findFirst({
          where: rebookingCandidateWhere({
            routeId: ticket.flight.routeId,
            originalFlightId: ticket.flightId,
            flightId: newFlightId,
            now,
          }),
          select: {
            id: true,
            code: true,
            economyCapacity: true,
            economyOccupied: true,
            firstClassCapacity: true,
            firstClassOccupied: true,
          },
        });

        if (!candidate) throw new RebookingConflictError("FLIGHT_NOT_ELIGIBLE");

        const capacity =
          seatClass === SeatClass.FIRST ? candidate.firstClassCapacity : candidate.economyCapacity;
        const occupied =
          seatClass === SeatClass.FIRST ? candidate.firstClassOccupied : candidate.economyOccupied;

        if (availableSeats(capacity, occupied) <= 0) {
          throw new RebookingConflictError("NO_CAPACITY");
        }

        // Reserva de cupo race-safe: la condición se re-evalúa bajo el lock de fila.
        const seatTaken = await tx.flight.updateMany({
          where: {
            id: candidate.id,
            status: "SCHEDULED",
            departureAt: { gt: now },
            ...(seatClass === SeatClass.FIRST
              ? { firstClassOccupied: { lt: candidate.firstClassCapacity } }
              : { economyOccupied: { lt: candidate.economyCapacity } }),
          },
          data:
            seatClass === SeatClass.FIRST
              ? { firstClassOccupied: { increment: 1 } }
              : { economyOccupied: { increment: 1 } },
        });

        if (seatTaken.count === 0) throw new RebookingConflictError("NO_CAPACITY");

        // El pasaje deja de ocupar cupo en el vuelo original.
        await tx.flight.update({
          where: { id: ticket.flightId },
          data:
            seatClass === SeatClass.FIRST
              ? { firstClassOccupied: { decrement: 1 } }
              : { economyOccupied: { decrement: 1 } },
        });

        const taken = await tx.ticket.findMany({
          where: { flightId: candidate.id, seatClass, seat: { not: null } },
          select: { seat: true },
          distinct: ["seat"],
        });

        const seats = assignSeats(
          taken.flatMap((row) => row.seat ?? []),
          1,
          seatRows(seatClass, capacity),
          seatLetters(seatClass),
        );

        if (seats.length === 0) throw new RebookingConflictError("NO_SEAT");
        const [seat] = seats;

        const ticketIndex = Math.max(
          0,
          ticket.booking.tickets.findIndex((bookingTicket) => bookingTicket.id === ticket.id),
        );
        const number = ticketNumber(
          ticket.booking.code,
          ticketIndex,
          rebookingNumberSuffix(contingency.id),
        );

        await tx.ticket.update({
          where: { id: ticket.id },
          data: { flightId: candidate.id, seat, number, issuedAt: now },
        });

        // I1: los demás tokens PENDING del mismo pasaje quedan resueltos como
        // REBOOK para que ningún enlace sibling vuelva a operar sobre él.
        await tx.ticketContingency.updateMany({
          where: {
            ticketId: ticket.id,
            resolution: ContingencyResolution.PENDING,
          },
          data: {
            resolution: ContingencyResolution.REBOOK,
            resolvedAt: now,
          },
        });

        // Sprint 3 no tiene plantilla de confirmación de reprogramación. La fila
        // se registra en estado terminal (no PENDING invisible para siempre).
        await tx.emailNotification.create({
          data: {
            id: newId("EmailNotification"),
            type: EmailType.REBOOKING_CONFIRMATION,
            recipientEmail: ticket.booking.contactEmail,
            subject: `Reprogramación confirmada - vuelo ${candidate.code} - reserva ${ticket.booking.code}`,
            bookingId: ticket.bookingId,
            flightChangeId: contingency.flightChangeId,
            status: EmailStatus.FAILED,
            attempts: 0,
            lastError: "No hay plantilla de confirmación de reprogramación en Sprint 3",
          },
        });

        return {
          type: "ok",
          ticketId: ticket.id,
          newFlightId: candidate.id,
          flightCode: candidate.code,
          seat,
          ticketNumber: number,
          resolvedAt: now,
        };
      },
    );
  } catch (error) {
    if (error instanceof RebookingConflictError) {
      return { type: "conflict", reason: error.reason };
    }

    if (error instanceof TicketNotIssuedError) {
      // La transacción ya se revirtió: no se movió el pasaje ni el cupo.
      const existing = await prisma.ticketContingency.findUnique({
        where: { accessToken },
        select: { resolution: true, resolvedAt: true },
      });

      if (!existing) return { type: "notFound" };
      if (existing.resolution !== ContingencyResolution.PENDING) {
        return {
          type: "alreadyResolved",
          resolution: existing.resolution,
          resolvedAt: existing.resolvedAt!,
        };
      }

      return { type: "conflict", reason: "TICKET_NOT_ACTIVE" };
    }

    if (error instanceof RebookingRaceError) {
      const existing = await prisma.ticketContingency.findUnique({
        where: { accessToken },
        select: { resolution: true, resolvedAt: true },
      });

      if (!existing) return { type: "notFound" };
      if (existing.resolution === ContingencyResolution.PENDING) {
        return { type: "conflict", reason: "NO_CAPACITY" };
      }

      return {
        type: "alreadyResolved",
        resolution: existing.resolution,
        resolvedAt: existing.resolvedAt!,
      };
    }

    // Colisión de asiento/número por una reprogramación concurrente: la
    // transacción ya se revirtió y el pasaje no quedó a medio mover.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { type: "conflict", reason: "NO_SEAT" };
    }

    throw error;
  }
}
