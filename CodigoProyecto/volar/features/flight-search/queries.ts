import { prisma } from "@/lib/prisma";
import type { FlightGetPayload } from "@/generated/prisma/models";
import { parseDateString } from "@/lib/dates";
import { availableSeats, isOnSale } from "@/features/flights/availability";
import type { FlightSearchValues } from "./schema";

export type FlightSearchResult = {
  id: string;
  code: string;
  date: Date;
  departureAt: Date;
  arrivalAt: Date;
  airplaneModel: string;
  origin: { id: string; code: string; city: string };
  destination: { id: string; code: string; city: string };
  economyFare: string;
  economyAvailable: number;
  firstClassFare: string;
  firstClassAvailable: number;
};

// Lo que hace falta de cada vuelo para evaluar isOnSale y armar el resultado.
const FLIGHT_ON_SALE_INCLUDE = {
  route: {
    select: {
      origin: { select: { id: true, code: true, city: true } },
      destination: { select: { id: true, code: true, city: true } },
    },
  },
  airplane: { select: { model: true } },
  salesPeriod: { select: { startDate: true, endDate: true } },
} as const;

type FlightOnSaleRow = FlightGetPayload<{ include: typeof FLIGHT_ON_SALE_INCLUDE }>;

function toSearchResult(f: FlightOnSaleRow): FlightSearchResult {
  return {
    id: f.id,
    code: f.code,
    date: f.date,
    departureAt: f.departureAt,
    arrivalAt: f.arrivalAt,
    airplaneModel: f.airplane.model,
    origin: f.route.origin,
    destination: f.route.destination,
    economyFare: f.economyFare.toString(),
    economyAvailable: availableSeats(f.economyCapacity, f.economyOccupied),
    firstClassFare: f.firstClassFare.toString(),
    firstClassAvailable: availableSeats(f.firstClassCapacity, f.firstClassOccupied),
  };
}

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
    include: FLIGHT_ON_SALE_INCLUDE,
  });

  const now = new Date();
  return rows.filter((f) => isOnSale(f, now)).map(toSearchResult);
}

/**
 * US-14 (inicio de compra) / US-08: el vuelo, solo si sigue a la venta. Un
 * intento directo (URL armada a mano, resultado viejo) sobre un vuelo fuera
 * de período, cancelado, partido o sin cupo devuelve null.
 */
export async function getFlightOnSale(id: string): Promise<FlightSearchResult | null> {
  const flight = await prisma.flight.findUnique({ where: { id }, include: FLIGHT_ON_SALE_INCLUDE });
  if (!flight || !isOnSale(flight, new Date())) return null;
  return toSearchResult(flight);
}
