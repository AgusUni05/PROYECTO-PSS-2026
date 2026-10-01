"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const ADMIN_NAV_ITEMS = [
  { href: "/admin/aeropuertos", label: "Aeropuertos", us: "US-01" },
  { href: "/admin/aviones", label: "Aviones", us: "US-02" },
  { href: "/admin/trayectos", label: "Trayectos", us: "US-03" },
  { href: "/admin/vuelos", label: "Vuelos", us: "US-04/07/09/11" },
] as const;

const GROUPS = [
  { label: "Catálogo maestro", items: ADMIN_NAV_ITEMS.slice(0, 3) },
  { label: "Operaciones", items: ADMIN_NAV_ITEMS.slice(3) },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-7">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[11px] font-bold tracking-[0.14em] text-tower-muted uppercase">
            {group.label}
          </p>
          <nav className="flex flex-col gap-1">
            {group.items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-[46px] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                    active
                      ? "bg-white/10 text-white before:absolute before:top-3 before:bottom-3 before:left-[-16px] before:w-[3px] before:rounded-r-[3px] before:bg-tower-accent"
                      : "text-tower-muted hover:bg-white/6 hover:text-white",
                  )}
                >
                  {item.label}
                  <span className="ml-auto font-mono text-[10px] text-tower-muted">{item.us}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );
}
