import { SiteHeader } from "@/components/site-header";
import { FlightSearchForm } from "@/features/flight-search/components/flight-search-form";
import { listActiveAirports } from "@/features/airports/queries";

// Sitio público (US-28/US-29): no exige sesión para nada. La acción principal
// es buscar vuelos (US-13); la cuenta se pide recién al iniciar una compra.
export default async function Home() {
  const airports = await listActiveAirports();

  return (
    <div className="flex flex-1 flex-col bg-background">
      <section className="relative overflow-hidden bg-tower pb-[132px] text-white">
        <div className="mx-auto max-w-5xl px-8">
          <SiteHeader />
          <div className="relative mt-8 max-w-[620px]">
            <HeroArc />
            <div className="relative flex flex-col gap-4">
              <span className="animate-rise font-mono text-xs tracking-[0.22em] text-tower-accent uppercase">
                Sistema de gestión de vuelos
              </span>
              <h1 className="animate-rise animate-rise-d1 text-[60px] leading-[1.02] font-extrabold tracking-[-0.04em]">
                ¿A dónde querés viajar?
              </h1>
              <p className="animate-rise animate-rise-d2 text-[17px] text-tower-muted">
                Volá por Argentina con VolAR.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto -mt-[84px] w-full max-w-5xl flex-1 px-8">
        <div className="animate-rise animate-rise-d3">
          <FlightSearchForm airports={airports} />
        </div>
      </main>
    </div>
  );
}

function HeroArc() {
  return (
    <svg
      className="pointer-events-none absolute -right-5 top-[60px] h-[320px] w-[560px]"
      viewBox="0 0 560 320"
      aria-hidden="true"
    >
      <path
        d="M30 290 C 170 40, 400 30, 520 170"
        fill="none"
        stroke="rgba(255,255,255,.4)"
        strokeWidth="2"
        strokeDasharray="4 10"
        strokeLinecap="round"
        className="motion-safe:animate-[dash_2.6s_linear_infinite]"
      />
      <circle cx="30" cy="290" r="6" fill="#A996FF" />
      <circle cx="520" cy="170" r="6" fill="#fff" />
      <text x="46" y="296" fill="#C9C3F2" fontFamily="var(--font-mono)" fontSize="12" letterSpacing="2">
        AEP
      </text>
      <text x="470" y="200" fill="#C9C3F2" fontFamily="var(--font-mono)" fontSize="12" letterSpacing="2">
        BRC
      </text>
    </svg>
  );
}
