// US-41: precio fijo por valija adicional en bodega y tope por pasajero.
export const BAGGAGE_UNIT_PRICE = 45000;
export const MAX_EXTRA_BAGS = 3;

/** Importe de las valijas elegidas, sin centavos (el precio es entero). */
export function baggageTotal(bags: number): number {
  return bags * BAGGAGE_UNIT_PRICE;
}
