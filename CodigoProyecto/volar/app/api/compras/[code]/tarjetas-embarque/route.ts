import { purchasePdfResponse } from "@/features/purchase/downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// US-38: descarga de las tarjetas de embarque de los pasajeros con check-in.
// Misma autorización que e-tickets y factura: la titularidad sale de la sesión.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  return purchasePdfResponse(code, "boarding-passes");
}
