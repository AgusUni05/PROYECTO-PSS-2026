import { ListNavLink } from "@/components/list-navigation";
import { cn } from "@/lib/utils";
import { parseDateString } from "@/lib/dates";
import { formatCurrency, formatLongDate } from "@/features/flights/format";
import type { FlexibleDay } from "../flexible-dates";
import type { FlightSearchValues } from "../schema";

const weekdayFormatter = new Intl.DateTimeFormat("es-AR", { weekday: "short", timeZone: "UTC" });

/** "2026-09-28" → "Lun 28/09" (busqueda_flexible.html). */
function shortDayLabel(date: string): string {
  const weekday = weekdayFormatter.format(parseDateString(date)).replace(".", "");
  const [, month, day] = date.split("-");
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day}/${month}`;
}

function offsetLabel(offset: number): string {
  if (offset === 0) return "Fecha buscada";
  const days = Math.abs(offset) === 1 ? "día" : "días";
  return `${offset > 0 ? "+" : "-"}${Math.abs(offset)} ${days}`;
}

function flightsLabel(day: FlexibleDay): string {
  return `${day.flightCount} ${day.flightCount === 1 ? "vuelo" : "vuelos"} · ${day.availableSeats} cupos`;
}

// US-42: grilla de fechas cercanas (±3 días) que se muestra cuando la fecha
// buscada no tiene vuelos a la venta (busqueda_flexible.html). Cada día con
// vuelos lleva a la búsqueda de ese día, que muestra las tarjetas de US-14.
export function FlexibleDatesGrid({
  days,
  search,
}: {
  days: FlexibleDay[];
  search: FlightSearchValues;
}) {
  const hasAlternatives = days.some((day) => day.status === "available");

  return (
    <section aria-labelledby="fechas-cercanas" className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div>
        <h2 id="fechas-cercanas" className="text-lg font-extrabold tracking-[-0.02em]">
          Fechas cercanas (±3 días)
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasAlternatives
            ? "Elegí un día para ver sus vuelos y tarifas."
            : "Tampoco hay vuelos a la venta en los días cercanos. Probá con otro origen o destino."}
        </p>
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((day) => (
          <li key={day.date}>
            <DayCell day={day} search={search} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function DayCell({ day, search }: { day: FlexibleDay; search: FlightSearchValues }) {
  const isSearched = day.offset === 0;
  const header = (
    <>
      <span className={cn("font-mono text-[11px] font-bold tracking-[0.08em] uppercase", isSearched ? "text-foreground" : "text-muted-foreground")}>
        {offsetLabel(day.offset)}
      </span>
      <span className="text-sm font-extrabold">{shortDayLabel(day.date)}</span>
    </>
  );
  const base = "flex h-full min-h-32 flex-col items-center justify-between gap-1 rounded-xl border px-2 py-3 text-center";

  if (day.status === "available" && day.minFare !== null) {
    const href = `/vuelos?${new URLSearchParams({ ...search, fecha: day.date })}`;
    return (
      <ListNavLink
        href={href}
        className={cn(
          base,
          "cursor-pointer bg-card transition-colors hover:border-primary hover:bg-secondary focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/40 focus-visible:outline-none",
          day.isCheapest ? "border-primary" : "border-border",
        )}
      >
        <span className="sr-only">
          {`Ver los vuelos del ${formatLongDate(parseDateString(day.date))}, desde ${formatCurrency(day.minFare)}.`}
        </span>
        {header}
        <span className="text-base font-extrabold tracking-[-0.02em]">{formatCurrency(day.minFare)}</span>
        <span className="text-[11px] text-muted-foreground">{flightsLabel(day)}</span>
        {day.isCheapest && (
          <span className="rounded-full bg-success-muted px-2 py-0.5 text-[11px] font-bold text-success">
            Menor precio
          </span>
        )}
      </ListNavLink>
    );
  }

  return (
    <div
      className={cn(
        base,
        "bg-muted text-muted-foreground",
        isSearched ? "border-2 border-dashed border-foreground/30" : "border-dashed border-border",
        day.status === "unavailable" && "border-dotted opacity-70",
      )}
    >
      {header}
      <span className="text-xs font-bold">{day.status === "unavailable" ? "No disponible" : "Sin vuelos"}</span>
    </div>
  );
}
