import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

// Página mostrada cuando no existe la ruta pedida.
export default function NotFound() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-3.5 overflow-hidden py-24 text-center">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 grid place-items-center text-[160px] font-extrabold tracking-[-0.06em] text-transparent [-webkit-text-stroke:1.5px_#E2DFF0] select-none sm:text-[220px] lg:text-[300px]"
      >
        404
      </span>
      <span className="relative grid size-16 place-items-center rounded-[20px] bg-tower text-white shadow-[0_18px_40px_-16px_rgba(22,19,61,0.6)] motion-safe:animate-[bob_3.4s_ease-in-out_infinite]">
        <Compass className="size-[26px]" />
      </span>
      <p className="relative font-mono text-xs tracking-[0.28em] text-destructive uppercase">
        Error 404
      </p>
      <h1 className="relative max-w-[460px] px-4 text-[22px] font-extrabold tracking-[-0.03em] sm:text-[28px]">
        No encontramos esta página
      </h1>
      <p className="relative max-w-md text-[15px] leading-[1.6] text-muted-foreground">
        El enlace puede estar roto o la página puede haberse movido. Volvé al inicio para buscar tu
        próximo vuelo.
      </p>
      <Link href="/" className={buttonVariants({ className: "relative mt-2.5" })}>
        Volver al inicio
      </Link>
    </div>
  );
}
