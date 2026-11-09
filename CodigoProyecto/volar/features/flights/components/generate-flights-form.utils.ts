/**
 * US-40: capacidad total de la aeronave (Economy + Primera). Un campo vacío
 * llega como NaN (valueAsNumber), y en ese caso no hay total para mostrar.
 */
export function totalCapacityLabel(economy: number, firstClass: number): string {
  if (!Number.isFinite(economy) || !Number.isFinite(firstClass)) return "—";
  const total = economy + firstClass;
  return `${total} ${total === 1 ? "asiento" : "asientos"}`;
}
