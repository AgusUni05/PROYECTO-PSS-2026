import { monotonicFactory } from "ulid";
import { z } from "zod";

/**
 * Generador de IDs: tres letras significativas de la entidad + "_" + ULID.
 * Ej: AER_01JB8Z3K4M5N6P7Q8R9S0T1V2W
 *
 * El prefijo identifica la entidad a simple vista (en logs, URLs, soporte)
 * y el ULID aporta orden cronológico + unicidad sin colisiones.
 */
const ulid = monotonicFactory();

export const ID_PREFIXES = {
  User: "USU",
  Airport: "AER",
  Airplane: "AVI",
  Route: "TRA",
  SalesPeriod: "PER",
  Flight: "VUE",
  Booking: "RES",
  Ticket: "PAS",
  Payment: "PAG",
  Invoice: "FAC",
  InvoiceItem: "ITF",
  FlightChange: "CVU",
  TicketContingency: "CON",
  Refund: "REE",
  EmailNotification: "NOT",
} as const;

export type EntityName = keyof typeof ID_PREFIXES;

/** Genera un nuevo ID con el prefijo de la entidad, ej: newId("Airport") */
export function newId(entity: EntityName): string {
  return `${ID_PREFIXES[entity]}_${ulid()}`;
}

/** Schema Zod que valida el formato de ID de una entidad puntual (para FKs). */
export function idSchema(entity: EntityName) {
  const prefix = ID_PREFIXES[entity];
  return z
    .string()
    .regex(
      new RegExp(`^${prefix}_[0-9A-HJKMNP-TV-Z]{26}$`),
      `ID de ${entity} inválido`,
    );
}
