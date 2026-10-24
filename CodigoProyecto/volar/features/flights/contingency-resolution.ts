import { prisma } from "@/lib/prisma";
import { newId } from "@/lib/id";
import {
  BookingStatus,
  ContingencyResolution,
  RefundStatus,
  SeatClass,
  TicketStatus,
} from "@/generated/prisma/enums";
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

  return prisma.$transaction(async (tx) => {
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
}
