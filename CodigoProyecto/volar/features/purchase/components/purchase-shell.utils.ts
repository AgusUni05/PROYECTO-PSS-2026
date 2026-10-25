/** Búsqueda de la que salió el vuelo, para volver a elegir. */
export function resultsHref(flight: {
  date: Date;
  origin: { id: string };
  destination: { id: string };
}): string {
  const params = new URLSearchParams({
    origen: flight.origin.id,
    destino: flight.destination.id,
    fecha: flight.date.toISOString().slice(0, 10),
  });
  return `/vuelos?${params}`;
}
