/** US-09: cupo disponible de una clase = capacidad − ocupados (nunca negativo). */
export function availableSeats(capacity: number, occupied: number): number {
  return Math.max(0, capacity - occupied);
}
