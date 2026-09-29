import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// US-30: pantalla mostrada cuando forbidden() corta un acceso no autorizado por rol.
export default function Forbidden() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-sm font-medium text-muted-foreground">Error 403</p>
      <h1 className="text-2xl font-semibold">No tenés permiso para acceder a esta página</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Esta sección está restringida a administradores. Si creés que es un error, contactá a
        un administrador del sistema.
      </p>
      <Link href="/" className={buttonVariants()}>
        Volver al inicio
      </Link>
    </div>
  );
}
