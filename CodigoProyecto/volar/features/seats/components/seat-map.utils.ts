/** Asiento actual de cada pasajero que puede elegir (id del pasaje → asiento). */
export type SeatAssignments = Record<string, string | null>;

/**
 * US-37: asigna `seat` al pasajero activo. Si ese asiento lo tenía otro
 * pasajero de la reserva, intercambian: el otro se queda con el asiento que
 * tenía el activo.
 */
export function pickSeat(assignments: SeatAssignments, activeId: string, seat: string): SeatAssignments {
  const owner = Object.keys(assignments).find((id) => assignments[id] === seat);
  if (owner === activeId) return assignments;
  const next = { ...assignments, [activeId]: seat };
  if (owner) next[owner] = assignments[activeId];
  return next;
}

/** Pasajero que queda activo después de elegir: el siguiente de la lista, o el mismo si es el último. */
export function nextPassenger(ids: string[], activeId: string): string {
  const index = ids.indexOf(activeId);
  return ids[Math.min(index + 1, ids.length - 1)] ?? activeId;
}

/** Pasajeros cuyo asiento cambió respecto del inicial. */
export function changedSeats(
  initial: SeatAssignments,
  current: SeatAssignments,
): { ticketId: string; seat: string }[] {
  return Object.keys(current).flatMap((ticketId) => {
    const seat = current[ticketId];
    return seat !== null && seat !== initial[ticketId] ? [{ ticketId, seat }] : [];
  });
}
