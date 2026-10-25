import type { Metadata } from "next";
import { reservationSearchSchema } from "@/features/counter/schema";
import { searchReservations } from "@/features/counter/queries";
import { getBookingComprobantes } from "@/features/purchase/queries";
import { ReservationSearchForm } from "@/features/counter/components/reservation-search-form";
import { ReservationResultsList } from "@/features/counter/components/reservation-results-list";
import { ReservationDetail } from "@/features/counter/components/reservation-detail";

export const metadata: Metadata = { title: "Mostrador: consulta de reservas — VolAR" };

type SearchParams = Record<string, string | string[] | undefined>;

// US-34: consulta de reservas por DNI, apellido o código (mostrador.html, pestaña 3).
export default async function MostradorReservasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const parsed = sp.criterio !== undefined ? reservationSearchSchema.safeParse(sp) : null;
  const results = parsed?.success ? await searchReservations(parsed.data.criterio) : [];

  const selectedCode = typeof sp.codigo === "string" ? sp.codigo.trim().toUpperCase() : null;
  const detail = selectedCode ? await getBookingComprobantes(selectedCode) : null;

  return (
    <div className="space-y-6">
      <ReservationSearchForm defaultValue={parsed?.success ? parsed.data.criterio : ""} />

      {parsed && !parsed.success && (
        <p className="text-sm text-destructive">{parsed.error.issues[0]?.message}</p>
      )}

      {parsed?.success && !detail && (
        <ReservationResultsList criterio={parsed.data.criterio} results={results} />
      )}

      {detail && <ReservationDetail booking={detail} />}
    </div>
  );
}
