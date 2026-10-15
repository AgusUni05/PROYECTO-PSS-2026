import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";

/**
 * US-20..US-24: marco de la compra en línea (4 pasos). Lo comparten la pantalla
 * de pago (paso 3) y la de comprobantes (paso 4).
 */
export function PurchaseShell({
  title,
  currentStep,
  children,
}: {
  title: string;
  currentStep: 3 | 4;
  children: React.ReactNode;
}) {
  const comprobantes = currentStep === 4;

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
            <Step n={1} label="Selección" done />
            <StepLine />
            <Step n={2} label="Pasajeros" done />
            <StepLine />
            <Step n={3} label="Pago" done={comprobantes} active={!comprobantes} />
            <StepLine />
            <Step n={4} label="Comprobantes" active={comprobantes} />
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
    <li className={cn("flex items-center gap-2", (active || done) && "text-foreground")}>
      <span
        className={cn(
          "grid size-7 place-items-center rounded-full border-[1.5px] border-[#D6D4E2] bg-card text-xs",
          done && "border-primary bg-secondary text-foreground",
          active && "border-primary bg-primary text-primary-foreground shadow-[0_0_0_5px_var(--secondary)]",
        )}
      >
        {done ? "✓" : n}
      </span>
      {label}
    </li>
  );
}

function StepLine() {
  return <span aria-hidden className="h-0.5 w-4 rounded-full bg-[#DCDAE8] sm:w-9" />;
}

/** Motivo por el que la pantalla de compra no puede mostrarse. */
export function Unavailable({ title, description }: { title: string; description: string }) {
  return (
    <Alert variant="destructive" className="rounded-2xl p-5">
      <AlertTitle className="text-[15px]">{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{description}</p>
        <Link href="/vuelos" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Volver a buscar
        </Link>
      </AlertDescription>
    </Alert>
  );
}
