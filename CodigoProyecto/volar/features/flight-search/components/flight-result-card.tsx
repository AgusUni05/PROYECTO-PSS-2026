import Link from "next/link";
import { ArrowRight, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatDuration } from "@/features/routes/time";
import { formatCurrency, formatTime } from "@/features/flights/format";
import { buildClassOptions, type ClassOption } from "../class-options";
import type { FlightSearchResult } from "../queries";

// US-14: tarjeta de un resultado de búsqueda (busqueda_pasajero.html): horarios,
// tarifa y cupo por clase, y acceso directo a la compra de cada clase.
export function FlightResultCard({ flight }: { flight: FlightSearchResult }) {
  const departure = formatTime(flight.departureAt);
  const arrival = formatTime(flight.arrivalAt);
  const nextDay =
    flight.arrivalAt.toISOString().slice(0, 10) !== flight.departureAt.toISOString().slice(0, 10);

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-[#D9D6EA] hover:shadow-[0_22px_44px_-26px_rgba(22,19,61,0.4)] md:grid-cols-[minmax(0,1fr)_248px_248px]">
      <div className="flex flex-col justify-center gap-5 px-5 py-6 sm:px-7">
        <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
          <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-xs">{flight.code}</span>
          {flight.airplaneModel}
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-[22px]">
          <div>
            <div className="text-[24px] leading-none font-extrabold tracking-[-0.035em] sm:text-[32px]">{departure}</div>
            <div className="mt-1.5 text-[13px] text-muted-foreground">
              {flight.origin.code} · {flight.origin.city}
            </div>
          </div>
          <div className="group/track relative h-[22px]">
            <span className="absolute inset-x-1 top-1/2 border-t-2 border-dotted border-[#CFCBE3]" />
            <span className="relative z-[1] size-2.5 rounded-full border-2 border-primary bg-card" />
            <Plane
              className="absolute top-1/2 left-[12%] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-card text-primary transition-[left] duration-[1200ms] ease-out group-hover/track:left-[86%]"
              size={16}
            />
            <span className="absolute right-0 top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-primary" />
            <div className="absolute inset-x-0 top-full mt-1.5 text-center text-xs font-semibold text-muted-foreground">
              {formatDuration(departure, arrival)} · Directo
            </div>
          </div>
          <div className="text-right">
            <div className="text-[24px] leading-none font-extrabold tracking-[-0.035em] sm:text-[32px]">
              {arrival}
              {nextDay && <sup className="ml-0.5 text-xs text-muted-foreground">+1 día</sup>}
            </div>
            <div className="mt-1.5 text-[13px] text-muted-foreground">
              {flight.destination.code} · {flight.destination.city}
            </div>
          </div>
        </div>
      </div>

      {buildClassOptions(flight).map((option) => (
        <ClassBox key={option.seatClass} flightId={flight.id} option={option} />
      ))}
    </div>
  );
}

function ClassBox({ flightId, option }: { flightId: string; option: ClassOption }) {
  const soldOut = option.status === "sold-out";

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 border-t border-border px-5 py-[22px] transition-colors sm:px-[22px] md:border-t-0 md:border-l",
        soldOut ? "bg-[#FAFAFC]" : "hover:bg-[#FBFAFE]",
      )}
    >
      <span className="text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
        {option.label}
      </span>
      <span className={cn("mt-1.5 text-[28px] font-extrabold tracking-[-0.03em]", soldOut && "text-[#75728D] line-through decoration-2")}>
        {formatCurrency(option.fare)}
      </span>
      <span className="text-xs text-muted-foreground">por pasajero</span>

      <span className="my-3.5 flex min-h-6 items-center gap-1.5 text-[12.5px] text-muted-foreground">
        {soldOut && (
          <span className="inline-flex items-center rounded-full bg-destructive-muted px-2.5 py-1 text-xs font-bold text-destructive">
            Agotado
          </span>
        )}
        {option.status === "last-seats" && (
          <span className="relative inline-flex items-center gap-1.5 rounded-full bg-warning-muted px-2.5 py-1 text-xs font-bold text-warning">
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-current" />
            Últimos {option.available} cupos
          </span>
        )}
        {option.status === "available" && (
          <>
            <strong className="text-foreground">{option.available}</strong> cupos disponibles
          </>
        )}
      </span>

      {soldOut ? (
        <Button variant="secondary" className="mt-auto w-full" disabled>
          No disponible
        </Button>
      ) : (
        <Link
          href={`/compra?${new URLSearchParams({ vuelo: flightId, clase: option.seatClass })}`}
          className={cn(
            buttonVariants({ variant: option.seatClass === "ECONOMY" ? "default" : "outline" }),
            "mt-auto w-full",
          )}
        >
          Seleccionar
          <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
