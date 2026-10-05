"use client";

import { createContext, useCallback, useContext, useTransition, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ListNavigation = {
  /** true mientras se espera la respuesta de una navegación de listado. */
  isPending: boolean;
  /** Cambia la URL sin recargar la página (la tabla muestra su skeleton con isPending). */
  navigate: (href: string) => void;
};

const ListNavigationContext = createContext<ListNavigation | null>(null);

// Navegación de filtros y paginación sin recarga completa: el cambio de URL corre
// dentro de una transición de React, así la pantalla anterior sigue visible hasta que
// llegan los datos nuevos (y solo la zona de resultados muestra su skeleton).
export function ListNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (href: string) => {
      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [router],
  );

  return (
    <ListNavigationContext.Provider value={{ isPending, navigate }}>{children}</ListNavigationContext.Provider>
  );
}

/** Navegación del listado. Sin provider cae a un push normal del router. */
export function useListNavigation(): ListNavigation {
  const context = useContext(ListNavigationContext);
  const router = useRouter();
  if (context) return context;
  return { isPending: false, navigate: (href) => router.push(href) };
}

/** Zona de resultados: muestra el skeleton mientras carga una navegación del listado. */
export function ListResults({ skeleton, children }: { skeleton: ReactNode; children: ReactNode }) {
  const { isPending } = useListNavigation();
  return isPending ? skeleton : children;
}

/** Link que navega dentro del listado (sin recarga) manteniendo el href real. */
export function ListNavLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const { navigate } = useListNavigation();
  return (
    <Link
      href={href}
      scroll={false}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </Link>
  );
}

/** Href del listado a partir del formulario de filtros: omite campos vacíos y vuelve a la página 1. */
export function buildListHref(basePath: string, form: HTMLFormElement): string {
  const params = new URLSearchParams();
  new FormData(form).forEach((value, key) => {
    if (typeof value === "string" && value.trim() !== "") params.set(key, value.trim());
  });
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** onSubmit de un formulario de filtros: navega sin recargar la página. */
export function useFilterSubmit(basePath: string) {
  const { navigate } = useListNavigation();
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(buildListHref(basePath, event.currentTarget));
  };
}
