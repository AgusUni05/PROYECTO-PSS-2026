import { purchasePdfResponse } from "@/features/purchase/downloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// US-36: descarga de la factura. El código llega por la ruta; la titularidad se
// resuelve con la sesión y no se leen parámetros ni cabeceras del cliente.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  return purchasePdfResponse(code, "invoice");
}
