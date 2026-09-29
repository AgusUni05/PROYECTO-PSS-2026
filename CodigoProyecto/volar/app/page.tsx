import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlightSearchForm } from "@/features/flight-search/components/flight-search-form";
import { listActiveAirports } from "@/features/airports/queries";

// Sitio público (US-28/US-29): no exige sesión para nada. La acción principal
// es buscar vuelos (US-13); la cuenta se pide recién al iniciar una compra.
export default async function Home() {
  const airports = await listActiveAirports();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-8 px-6 py-16">
        <div className="space-y-3 text-center">
          <span className="font-mono text-xs tracking-[0.3em] text-muted-foreground uppercase">
            Sistema de Gestión de Vuelos
          </span>
          <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">VolAR</h1>
          <p className="text-sm text-muted-foreground sm:text-base">Volá por Argentina con VolAR.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>¿A dónde querés viajar?</CardTitle>
          </CardHeader>
          <CardContent>
            <FlightSearchForm airports={airports} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
