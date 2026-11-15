import type { SeatClass } from "@/generated/prisma/enums";
import { seatLetters } from "@/features/purchase/issuance";

// US-37: asientos de una clase del vuelo para el mapa de la cabina, con la
// misma numeración que la emisión de la compra (US-23): cada clase arranca en
// la fila 1, con 4 asientos por fila en Primera y 6 en Economy.

export type CabinCapacity = { economyCapacity: number; firstClassCapacity: number };

export type CabinSection = {
  seatClass: SeatClass;
  letters: string[];
  /** Filas de la clase; la última puede estar incompleta. */
  rows: { number: number; seats: string[] }[];
  /** Asientos en orden de fila y letra: exactamente la capacidad de la clase. */
  seats: string[];
};

export function cabinSection(capacity: CabinCapacity, seatClass: SeatClass): CabinSection {
  const letters = seatLetters(seatClass);
  const count = seatClass === "FIRST" ? capacity.firstClassCapacity : capacity.economyCapacity;

  const rows: CabinSection["rows"] = [];
  const seats: string[] = [];
  for (let index = 0; index < count; index++) {
    const rowNumber = 1 + Math.floor(index / letters.length);
    const seat = `${rowNumber}${letters[index % letters.length]}`;
    if (rows.at(-1)?.number !== rowNumber) rows.push({ number: rowNumber, seats: [] });
    rows[rows.length - 1].seats.push(seat);
    seats.push(seat);
  }
  return { seatClass, letters, rows, seats };
}
