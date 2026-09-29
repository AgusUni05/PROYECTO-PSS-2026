"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const ADMIN_NAV_ITEMS = [
  { href: "/admin/aeropuertos", label: "Aeropuertos", us: "US-01" },
  { href: "/admin/aviones", label: "Aviones", us: "US-02" },
  { href: "/admin/trayectos", label: "Trayectos", us: "US-03" },
  { href: "/admin/vuelos", label: "Vuelos", us: "US-04/07" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1">
      {ADMIN_NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--tower-accent)] text-[var(--tower)]"
                : "text-[var(--tower-foreground)]/80 hover:bg-white/10 hover:text-[var(--tower-foreground)]",
            )}
          >
            {item.label}
            <span className="font-mono text-[0.6875rem] tracking-wide opacity-70">{item.us}</span>
          </Link>
        );
      })}
    </nav>
  );
}
