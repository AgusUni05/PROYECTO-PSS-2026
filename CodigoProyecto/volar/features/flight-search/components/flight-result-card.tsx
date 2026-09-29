import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card>
      <CardContent className="grid gap-4 md:grid-cols-[1fr_13rem_13rem] md:items-center">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              Vuelo {flight.code}
            </Badge>
            <span className="text-xs text-muted-foreground">Aeronave: {flight.airplaneModel}</span>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <div className="font-mono text-2xl font-semibold">{departure}</div>
              <div className="text-xs text-muted-foreground">
                {flight.origin.code} ({flight.origin.city})
              </div>
            </div>
            <div className="flex flex-1 flex-col items-center text-xs text-muted-foreground">
              <span>{formatDuration(departure, arrival)} directo</span>
              <span aria-hidden className="w-full border-t border-dashed" />
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl font-semibold">
                {arrival}
                {nextDay && <sup className="ml-0.5 text-xs text-muted-foreground">+1 día</sup>}
              </div>
              <div className="text-xs text-muted-foreground">
                {flight.destination.code} ({flight.destination.city})
              </div>
            </div>
          </div>
        </div>

        {buildClassOptions(flight).map((option) => (
          <ClassBox key={option.seatClass} flightId={flight.id} option={option} />
        ))}
      </CardContent>
    </Card>
  );
}

function ClassBox({ flightId, option }: { flightId: string; option: ClassOption }) {
  const soldOut = option.status === "sold-out";

  return (
    <div
      className={cn(
        "space-y-1.5 rounded-lg border p-3 text-center",
        soldOut && "bg-muted/50 text-muted-foreground",
      )}
    >
      <div className="text-xs font-medium tracking-wide uppercase">{option.label}</div>
      <div className={cn("font-heading text-xl font-semibold", soldOut && "line-through")}>
        {formatCurrency(option.fare)}
      </div>
      <div className="text-xs">
        {soldOut && <Badge variant="destructive">Agotado / No disponible</Badge>}
        {option.status === "last-seats" && (
          <span className="font-medium text-destructive">
            Últimos <strong>{option.available}</strong> cupos
          </span>
        )}
        {option.status === "available" && (
          <span>
            Cupos disponibles: <strong>{option.available}</strong>
          </span>
        )}
      </div>
      {soldOut ? (
        <Button variant="secondary" className="w-full" disabled>
          No Disponible
        </Button>
      ) : (
        <Link
          href={`/compra?${new URLSearchParams({ vuelo: flightId, clase: option.seatClass })}`}
          className={cn(
            buttonVariants({ variant: option.seatClass === "ECONOMY" ? "default" : "outline" }),
            "w-full",
          )}
        >
          Seleccionar {option.seatClass === "ECONOMY" ? "Economy" : "Primera"}
          <ArrowRight />
        </Link>
      )}
    </div>
  );
}
