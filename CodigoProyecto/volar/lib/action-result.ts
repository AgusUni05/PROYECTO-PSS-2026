/** Resultado uniforme de una server action: éxito con datos, o error general y/o por campo. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[] | undefined> };
