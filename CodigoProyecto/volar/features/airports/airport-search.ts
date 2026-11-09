// US-40: búsqueda predictiva sobre el catálogo maestro de aeropuertos.

export type AirportOption = { id: string; code: string; name: string; city: string };

/** Minúsculas y sin tildes, para que "cordoba" encuentre "Córdoba". */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/** El aeropuerto coincide si la búsqueda aparece en su código, nombre o ciudad. */
export function airportMatches(airport: AirportOption, query: string): boolean {
  const needle = normalize(query);
  if (!needle) return true;
  return [airport.code, airport.name, airport.city].some((field) => normalize(field).includes(needle));
}

/** Texto de cada sugerencia y del campo ya completado, ej: "EZE — Ministro Pistarini · Buenos Aires". */
export function airportLabel(airport: AirportOption): string {
  return `${airport.code} — ${airport.name} · ${airport.city}`;
}

/** Origen y destino no pueden ser el mismo: cada campo oculta el elegido en el otro. */
export function selectableAirports(airports: AirportOption[], excludedId: string): AirportOption[] {
  return airports.filter((airport) => airport.id !== excludedId);
}
