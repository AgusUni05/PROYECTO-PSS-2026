"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const ADMIN_NAV_ITEMS = [
  { href: "/admin/aeropuertos", label: "Aeropuertos" },
  { href: "/admin/aviones", label: "Aviones" },
  { href: "/admin/trayectos", label: "Trayectos" },
  { href: "/admin/vuelos", label: "Vuelos" },
] as const;

const GROUPS = [
  { label: "Catálogo maestro", items: ADMIN_NAV_ITEMS.slice(0, 3) },
  { label: "Operaciones", items: ADMIN_NAV_ITEMS.slice(3) },
] as const;

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
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
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-[46px] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                    active
                      ? "bg-white/10 text-white before:absolute before:top-3 before:bottom-3 before:left-[-16px] before:w-[3px] before:rounded-r-[3px] before:bg-tower-accent"
                      : "text-tower-muted hover:bg-white/6 hover:text-white",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );
}
