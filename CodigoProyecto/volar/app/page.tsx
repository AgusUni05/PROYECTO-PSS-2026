import { SiteHeader } from "@/components/site-header";
import { FlightSearchForm } from "@/features/flight-search/components/flight-search-form";
import { listActiveAirports } from "@/features/airports/queries";
import { PlaneIcon } from "@/components/plane-icon";

// Sitio público (US-28/US-29): no exige sesión para nada. La acción principal
// es buscar vuelos (US-13); la cuenta se pide recién al iniciar una compra.
export default async function Home() {
  const airports = await listActiveAirports();

  return (
    <div className="flex flex-1 flex-col bg-background">
      <section className="relative overflow-hidden bg-tower pb-24 text-white sm:pb-28 lg:pb-[132px]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <SiteHeader />
          <div className="relative mt-8 max-w-[620px]">
            <HeroArc />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-5 top-[60px] hidden h-[320px] w-[560px] sm:block"
            >
              <PlaneIcon
                className="absolute top-0 left-0 size-[22px] text-white motion-safe:animate-[fly-arc_3.4s_ease-in-out_infinite]"
                style={{
                  offsetPath: "path('M30 290 C 170 40, 400 30, 520 170')",
                  offsetRotate: "auto 45deg",
                }}
              />
            </div>
            <div className="relative flex flex-col gap-4">
              <span className="animate-rise font-mono text-xs tracking-[0.22em] text-tower-accent uppercase">
                Sistema de gestión de vuelos
              </span>
              <h1 className="animate-rise animate-rise-d1 text-[34px] leading-[1.05] font-extrabold tracking-[-0.04em] sm:text-[44px] lg:text-[60px] lg:leading-[1.02]">
                ¿A dónde querés viajar?
              </h1>
              <p className="animate-rise animate-rise-d2 text-[15px] text-tower-muted sm:text-[17px]">
                Volá por Argentina con VolAR.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto -mt-14 w-full max-w-5xl flex-1 px-4 sm:-mt-16 sm:px-6 lg:-mt-[84px] lg:px-8">
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
      className="pointer-events-none absolute -right-5 top-[60px] hidden h-[320px] w-[560px] sm:block"
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
