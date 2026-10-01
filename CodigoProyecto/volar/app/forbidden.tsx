import Link from "next/link";
import { Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

// US-30: pantalla mostrada cuando forbidden() corta un acceso no autorizado por rol.
export default function Forbidden() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-3.5 overflow-hidden py-24 text-center">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 grid place-items-center text-[300px] font-extrabold tracking-[-0.06em] text-transparent [-webkit-text-stroke:1.5px_#E2DFF0] select-none"
      >
        403
      </span>
      <span className="relative grid size-16 place-items-center rounded-[20px] bg-tower text-white shadow-[0_18px_40px_-16px_rgba(22,19,61,0.6)] motion-safe:animate-[bob_3.4s_ease-in-out_infinite]">
        <Lock className="size-[26px]" />
      </span>
      <p className="relative font-mono text-xs tracking-[0.28em] text-destructive uppercase">
        Error 403
      </p>
      <h1 className="relative max-w-[460px] text-[28px] font-extrabold tracking-[-0.03em]">
        No tenés permiso para acceder a esta página
      </h1>
      <p className="relative max-w-md text-[15px] leading-[1.6] text-muted-foreground">
        Esta sección está restringida a administradores. Si creés que es un error, contactá a
        un administrador del sistema.
      </p>
      <Link href="/" className={buttonVariants({ className: "relative mt-2.5" })}>
        Volver al inicio
      </Link>
    </div>
  );
}
