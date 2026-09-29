import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// Paginación reutilizable entre los listados admin (US-01/02/03): construye
// el href de cada página a partir de los filtros vigentes.
export function PaginationLinks({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}) {
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Página {page} de {pageCount}
      </span>
      <div className="flex gap-2">
        <PageLink disabled={page <= 1} href={buildHref(page - 1)}>
          « Anterior
        </PageLink>
        <PageLink disabled={page >= pageCount} href={buildHref(page + 1)}>
          Siguiente »
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({
  disabled,
  href,
  children,
}: {
  disabled: boolean;
  href: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        className={cn(
          buttonVariants({ variant: "secondary", size: "sm" }),
          "pointer-events-none opacity-50",
        )}
      >
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={buttonVariants({ variant: "secondary", size: "sm" })}>
      {children}
    </Link>
  );
}
