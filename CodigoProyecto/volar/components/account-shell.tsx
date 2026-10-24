import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

/**
 * US-35: marco común de las pantallas de cuenta (Mis Compras, Mi perfil).
 * Solo estructura: cabecera del sitio, migas de pan y encabezado de la
 * sección. La lógica de cada pantalla vive en su propio componente.
 */
export function AccountShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <nav
          aria-label="Migas de pan"
          className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground"
        >
          <Link href="/" className="hover:text-foreground">
            Inicio
          </Link>
          <span aria-hidden>/</span>
          <Link href="/cuenta" className="hover:text-foreground">
            Mi cuenta
          </Link>
          <span aria-hidden>/</span>
          <b aria-current="page" className="min-w-0 font-semibold break-words text-foreground">
            {title}
          </b>
        </nav>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <h1 className="text-[22px] font-extrabold tracking-[-0.035em] break-words sm:text-[26px] lg:text-[30px]">
              {title}
            </h1>
            {description && (
              <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>

        <div className="mt-6 min-w-0">{children}</div>
      </main>
    </div>
  );
}
