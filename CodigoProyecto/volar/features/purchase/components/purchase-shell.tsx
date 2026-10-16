import { Fragment } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";

const STEPS = ["Selección", "Pasajeros", "Pago", "Comprobantes"] as const;

export type PurchaseStep = 1 | 2 | 3 | 4;

/**
 * US-14..US-24: marco de la compra en línea (4 pasos). Lo comparten la
 * selección (paso 1), la carga de pasajeros (paso 2), el pago (paso 3) y los
 * comprobantes (paso 4): resalta el paso actual y marca los ya completados.
 */
export function PurchaseShell({
  title,
  currentStep,
  children,
}: {
  title: string;
  currentStep: PurchaseStep;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Inicio
          </Link>
          <span aria-hidden>/</span>
          <Link href="/vuelos" className="hover:text-foreground">
            Búsqueda de vuelos
          </Link>
          <span aria-hidden>/</span>
          <b className="font-semibold text-foreground">{title}</b>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <h1 className="text-[22px] font-extrabold tracking-[-0.035em] sm:text-[26px] lg:text-[30px]">
            {title}
          </h1>
          <ol className="flex list-none items-center gap-1.5 p-0 text-[11px] font-bold text-muted-foreground sm:gap-2.5 sm:text-[13px]">
            {STEPS.map((label, index) => {
              const n = index + 1;
              return (
                <Fragment key={label}>
                  {index > 0 && <StepLine reached={n <= currentStep} />}
                  <Step n={n} label={label} active={n === currentStep} done={n < currentStep} />
                </Fragment>
              );
            })}
          </ol>
        </div>

        {children}
      </main>
    </div>
  );
}

function Step({
  n,
  label,
  active = false,
  done = false,
}: {
  n: number;
  label: string;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <li
      className={cn("flex items-center gap-2", (active || done) && "text-foreground")}
      aria-current={active ? "step" : undefined}
    >
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full border-[1.5px] border-[#D6D4E2] bg-card text-xs",
          done && "border-primary bg-secondary text-foreground",
          active && "border-primary bg-primary text-primary-foreground shadow-[0_0_0_5px_var(--secondary)]",
        )}
        aria-label={done ? `${label} (completado)` : undefined}
      >
        {done ? "✓" : n}
      </span>
      {/* En pantallas chicas solo se nombra el paso actual para que entren los 4. */}
      <span className={cn(!active && "sr-only sm:not-sr-only")}>{label}</span>
    </li>
  );
}

function StepLine({ reached }: { reached: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("h-0.5 w-4 rounded-full bg-[#DCDAE8] sm:w-9", reached && "bg-primary")}
    />
  );
}

/** Búsqueda de la que salió el vuelo, para volver a elegir. */
export function resultsHref(flight: {
  date: Date;
  origin: { id: string };
  destination: { id: string };
}): string {
  const params = new URLSearchParams({
    origen: flight.origin.id,
    destino: flight.destination.id,
    fecha: flight.date.toISOString().slice(0, 10),
  });
  return `/vuelos?${params}`;
}

/** Motivo por el que la pantalla de compra no puede mostrarse. */
export function Unavailable({
  title,
  description,
  backHref = "/vuelos",
}: {
  title: string;
  description: string;
  backHref?: string;
}) {
  return (
    <Alert variant="destructive" className="rounded-2xl p-5">
      <AlertTitle className="text-[15px]">{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{description}</p>
        <Link href={backHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Volver a buscar
        </Link>
      </AlertDescription>
    </Alert>
  );
}
