import type { SeatClass } from "@/generated/prisma/enums";

export const SEAT_CLASS_LABELS: Record<SeatClass, string> = {
  ECONOMY: "Economy",
  FIRST: "Primera Clase",
};

/** Con este cupo o menos, la tarjeta avisa "Últimos N cupos" (busqueda_pasajero.html). */
export const LAST_SEATS_THRESHOLD = 5;

export type ClassOption = {
  seatClass: SeatClass;
  label: string;
  fare: string;
  available: number;
  status: "available" | "last-seats" | "sold-out";
};

type FlightFaresAndSeats = {
  economyFare: string;
  economyAvailable: number;
  firstClassFare: string;
  firstClassAvailable: number;
};

function classStatus(available: number): ClassOption["status"] {
  if (available <= 0) return "sold-out";
  if (available <= LAST_SEATS_THRESHOLD) return "last-seats";
  return "available";
}

/**
 * US-14: una opción por clase con su tarifa y cupo. Una clase sin cupo (o sin
 * capacidad) queda "sold-out": se muestra como "Agotado / No disponible" y no
 * se puede seleccionar (US-10).
 */
export function buildClassOptions(flight: FlightFaresAndSeats): ClassOption[] {
  return [
    {
      seatClass: "ECONOMY",
      label: SEAT_CLASS_LABELS.ECONOMY,
      fare: flight.economyFare,
      available: flight.economyAvailable,
      status: classStatus(flight.economyAvailable),
    },
    {
      seatClass: "FIRST",
      label: SEAT_CLASS_LABELS.FIRST,
      fare: flight.firstClassFare,
      available: flight.firstClassAvailable,
      status: classStatus(flight.firstClassAvailable),
    },
  ];
}
