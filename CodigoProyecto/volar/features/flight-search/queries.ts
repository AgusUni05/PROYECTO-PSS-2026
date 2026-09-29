import { prisma } from "@/lib/prisma";
import { parseDateString } from "@/lib/dates";
import { availableSeats, isOnSale } from "@/features/flights/availability";
import type { FlightSearchValues } from "./schema";

export type FlightSearchResult = {
  id: string;
  code: string;
  departureAt: Date;
  arrivalAt: Date;
  airplaneModel: string;
  origin: { code: string; city: string };
  destination: { code: string; city: string };
  economyFare: string;
  economyAvailable: number;
  firstClassFare: string;
  firstClassAvailable: number;
};

/**
 * US-13: vuelos del trayecto origen → destino en la fecha pedida, que estén a
 * la venta (ver isOnSale), ordenados por hora de salida. La base filtra por
 * ruta/fecha/estado (usa el índice [date, status]); el resto de las reglas se
 * evalúa con isOnSale, que es la misma definición que usa el inicio de compra.
 */
export async function searchFlights(params: FlightSearchValues): Promise<FlightSearchResult[]> {
  const rows = await prisma.flight.findMany({
    where: {
      status: "SCHEDULED",
      date: parseDateString(params.fecha),
      route: { originId: params.origen, destinationId: params.destino },
    },
    orderBy: { departureAt: "asc" },
    include: {
      route: {
        select: {
          origin: { select: { code: true, city: true } },
          destination: { select: { code: true, city: true } },
        },
      },
      airplane: { select: { model: true } },
      salesPeriod: { select: { startDate: true, endDate: true } },
    },
  });

  const now = new Date();
  return rows
    .filter((f) => isOnSale(f, now))
    .map((f) => ({
      id: f.id,
      code: f.code,
      departureAt: f.departureAt,
      arrivalAt: f.arrivalAt,
      airplaneModel: f.airplane.model,
      origin: f.route.origin,
      destination: f.route.destination,
      economyFare: f.economyFare.toString(),
      economyAvailable: availableSeats(f.economyCapacity, f.economyOccupied),
      firstClassFare: f.firstClassFare.toString(),
      firstClassAvailable: availableSeats(f.firstClassCapacity, f.firstClassOccupied),
    }));
}
