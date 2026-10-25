import { prisma } from "@/lib/prisma";
import type { BookingStatus, SalesChannel } from "@/generated/prisma/enums";

export type ReservationSummary = {
  code: string;
  contactName: string;
  status: BookingStatus;
  channel: SalesChannel;
  flightCode: string;
  originCode: string;
  destinationCode: string;
  date: Date;
};

/**
 * US-34: busca reservas (de cualquier canal, web o mostrador) por código
 * exacto, por el nombre de contacto de la compra, o por el documento/apellido
 * de alguno de sus pasajeros. No expone datos de pago (ver `getBookingComprobantes`,
 * que tampoco los selecciona: cumple RNF-08).
 */
export async function searchReservations(criterio: string): Promise<ReservationSummary[]> {
  const value = criterio.trim();
  if (!value) return [];

  const rows = await prisma.booking.findMany({
    where: {
      OR: [
        { code: value.toUpperCase() },
        { contactName: { contains: value, mode: "insensitive" } },
        {
          tickets: {
            some: {
              OR: [
                { documentNumber: value },
                { lastName: { contains: value, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      flight: {
        select: {
          code: true,
          date: true,
          route: {
            select: { origin: { select: { code: true } }, destination: { select: { code: true } } },
          },
        },
      },
    },
  });

  return rows.map((b) => ({
    code: b.code,
    contactName: b.contactName,
    status: b.status,
    channel: b.channel,
    flightCode: b.flight.code,
    originCode: b.flight.route.origin.code,
    destinationCode: b.flight.route.destination.code,
    date: b.flight.date,
  }));
}
