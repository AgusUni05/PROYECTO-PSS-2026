/** US-09: cupo disponible de una clase = capacidad − ocupados (nunca negativo). */
export function availableSeats(capacity: number, occupied: number): number {
  return Math.max(0, capacity - occupied);
}

type SeatCounts = {
  economyCapacity: number;
  economyOccupied: number;
  firstClassCapacity: number;
  firstClassOccupied: number;
};

/** US-13: el vuelo tiene cupo en al menos una clase. */
export function hasAvailableSeats(flight: SeatCounts): boolean {
  return (
    availableSeats(flight.economyCapacity, flight.economyOccupied) > 0 ||
    availableSeats(flight.firstClassCapacity, flight.firstClassOccupied) > 0
  );
}

export type SaleCheckFlight = SeatCounts & {
  status: "SCHEDULED" | "CANCELLED";
  date: Date;
  departureAt: Date;
  // Decimal de Prisma o number: se compara por su valor numérico.
  economyFare: { toString(): string };
  firstClassFare: { toString(): string };
  salesPeriod: { startDate: Date; endDate: Date };
};

/**
 * Única definición de "vuelo a la venta" (la usan la búsqueda y el inicio de
 * la compra): programado (US-06/US-13), sin partir, con ambas tarifas
 * definidas (US-11), dentro de su período de venta (US-08) y con cupo en al
 * menos una clase (US-13).
 */
export function isOnSale(flight: SaleCheckFlight, now: Date): boolean {
  return (
    flight.status === "SCHEDULED" &&
    flight.departureAt > now &&
    Number(flight.economyFare.toString()) > 0 &&
    Number(flight.firstClassFare.toString()) > 0 &&
    flight.date >= flight.salesPeriod.startDate &&
    flight.date <= flight.salesPeriod.endDate &&
    hasAvailableSeats(flight)
  );
}
