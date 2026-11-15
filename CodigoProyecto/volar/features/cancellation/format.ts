// US-39: importes de la liquidación con centavos, como en el wireframe ("$ 135.000,00").
const PESOS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPesos(amount: string): string {
  return PESOS.format(Number(amount));
}
