"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SEAT_CLASS_LABELS } from "@/features/flight-search/class-options";
import { chooseSeatsAction } from "../actions";
import type { SeatSelectionFlight } from "../queries";
import { changedSeats, nextPassenger, pickSeat, type SeatAssignments } from "./seat-map.utils";

type SeatMapProps = Pick<SeatSelectionFlight, "section" | "otherClass" | "occupied" | "passengers"> & {
  code: string;
  flightId: string;
};

// US-37: mapa de la cabina del paso 1 del check-in (seleccion_asiento.html).
// Se elige un pasajero y después un asiento libre de su clase; elegir el
// asiento de otro pasajero de la reserva los intercambia.
export function SeatMap({ code, flightId, section, otherClass, occupied, passengers }: SeatMapProps) {
  const router = useRouter();
  const initial: SeatAssignments = Object.fromEntries(passengers.map((p) => [p.id, p.seat]));
  const [assignments, setAssignments] = useState<SeatAssignments>(initial);
  const [activeId, setActiveId] = useState(passengers[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  const taken = new Set(occupied);
  const ownerOf = (seat: string) => passengers.findIndex((p) => assignments[p.id] === seat);
  const aisleAfter = section.letters.length / 2;
  const checkinHref = `/compra/checkin?${new URLSearchParams({ reserva: code })}`;
  const complete = passengers.every((p) => assignments[p.id] !== null);

  function choose(seat: string) {
    setAssignments((current) => pickSeat(current, activeId, seat));
    setActiveId((current) => nextPassenger(passengers.map((p) => p.id), current));
  }

  function confirm() {
    const changes = changedSeats(initial, assignments);
    if (changes.length === 0) {
      router.push(checkinHref);
      return;
    }
    startTransition(async () => {
      const result = await chooseSeatsAction({
        reserva: code,
        vuelo: flightId,
        asientos: changes.map((change) => ({ pasaje: change.ticketId, asiento: change.seat })),
      });
      if (!result.ok) {
        toast.error(result.error ?? "No se pudieron guardar los asientos.");
        router.refresh();
        return;
      }
      toast.success("Asientos confirmados.");
      router.push(checkinHref);
    });
  }

  return (
    <div className="space-y-4">
      <ol className="grid gap-2">
        {passengers.map((passenger, index) => {
          const active = passenger.id === activeId;
          return (
            <li key={passenger.id}>
              <button
                type="button"
                onClick={() => setActiveId(passenger.id)}
                aria-pressed={active}
                className={cn(
                  "flex w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors hover:border-primary",
                  active ? "border-primary bg-secondary" : "border-border",
                )}
              >
                <span className="min-w-0 font-bold break-words">{`${index + 1}. ${passenger.name}`}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {`Asiento ${assignments[passenger.id] ?? "—"}`}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground" aria-label="Referencias">
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded border border-border bg-card" /> Libre
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded bg-primary" /> Pasajero elegido
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded border border-primary bg-secondary" /> Tu reserva
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded bg-muted" /> Ocupado
        </li>
      </ul>

      {otherClass && (
        <p className="flex items-start gap-2 rounded-xl bg-muted px-3.5 py-2.5 text-xs text-muted-foreground">
          <Lock aria-hidden className="mt-px size-3.5 shrink-0" />
          {`${SEAT_CLASS_LABELS[otherClass]}: no disponible para un pasaje ${SEAT_CLASS_LABELS[section.seatClass]}.`}
        </p>
      )}

      <div className="overflow-x-auto">
        <div className="mx-auto grid w-max gap-1" role="group" aria-label={`Cabina ${SEAT_CLASS_LABELS[section.seatClass]}`}>
          <div className="flex items-center gap-1 text-center text-[11px] font-bold text-muted-foreground" aria-hidden>
            <span className="w-6" />
            {section.letters.map((letter, index) => (
              <span key={letter} className={cn("w-8", index === aisleAfter && "ml-4")}>
                {letter}
              </span>
            ))}
          </div>
          {section.rows.map((row) => (
            <div key={row.number} className="flex items-center gap-1">
              <span className="w-6 text-right text-[11px] font-bold text-muted-foreground" aria-hidden>
                {row.number}
              </span>
              {section.letters.map((letter, index) => {
                const seat = `${row.number}${letter}`;
                const spacing = index === aisleAfter && "ml-4";
                if (!row.seats.includes(seat)) return <span key={seat} className={cn("size-8", spacing)} />;

                const owner = ownerOf(seat);
                const isActive = owner >= 0 && passengers[owner].id === activeId;
                const isTaken = owner < 0 && taken.has(seat);
                const label = isTaken
                  ? `Asiento ${seat}, ocupado`
                  : owner >= 0
                    ? `Asiento ${seat}, de ${passengers[owner].name}`
                    : `Asiento ${seat}, libre`;
                return (
                  <button
                    key={seat}
                    type="button"
                    disabled={isTaken || isPending}
                    onClick={() => choose(seat)}
                    aria-label={label}
                    title={label}
                    className={cn(
                      "size-8 rounded-md text-[11px] font-bold transition-colors",
                      spacing,
                      isTaken && "cursor-not-allowed bg-muted text-muted-foreground/60",
                      !isTaken && owner < 0 && "cursor-pointer border border-border bg-card hover:border-primary hover:bg-secondary",
                      owner >= 0 && !isActive && "cursor-pointer border border-primary bg-secondary text-primary",
                      isActive && "cursor-pointer bg-primary text-primary-foreground",
                    )}
                  >
                    {owner >= 0 ? owner + 1 : ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <Button
        type="button"
        onClick={confirm}
        disabled={isPending || !complete}
        className="min-h-11 w-full sm:w-auto"
      >
        {isPending ? "Guardando…" : "Confirmar asientos y continuar al check-in"}
      </Button>
    </div>
  );
}
