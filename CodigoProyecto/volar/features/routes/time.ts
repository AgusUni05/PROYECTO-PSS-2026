/** "HH:mm" -> minutos desde medianoche. */
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** US-03: si la llegada es anterior a la partida, es del día siguiente. */
export function isNextDayArrival(departureTime: string, arrivalTime: string): boolean {
  return toMinutes(arrivalTime) < toMinutes(departureTime);
}

/** Duración estimada entre partida y llegada, ej: "1h 30m". Cruza medianoche si corresponde. */
export function formatDuration(departureTime: string, arrivalTime: string): string {
  const depMin = toMinutes(departureTime);
  let arrMin = toMinutes(arrivalTime);
  if (arrMin < depMin) arrMin += 24 * 60;

  const totalMinutes = arrMin - depMin;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}
