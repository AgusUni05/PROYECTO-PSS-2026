"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Menu, X } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { AdminNav } from "@/components/admin-nav";
import { PlaneIcon } from "@/components/plane-icon";

type Props = {
  firstName: string | null;
  lastName: string | null;
};

// Sidebar de administración: fija a la izquierda desde `lg`, y un drawer que
// se abre con el botón hamburguesa de la topbar en pantallas chicas.
export function AdminSidebar({ firstName, lastName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-tower-border bg-tower px-4 py-3 text-tower-foreground lg:hidden">
        <Link href="/" className="flex items-center gap-2 text-base font-extrabold tracking-tight">
          <span className="grid size-8 flex-none place-items-center rounded-lg bg-primary">
            <PlaneIcon className="size-4" />
          </span>
          VolAR
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú de administración"
          className="grid size-9 place-items-center rounded-lg text-tower-foreground transition-colors hover:bg-white/10"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {open && (
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-[260px] max-w-[85vw] flex-none -translate-x-full flex-col gap-6 overflow-y-auto bg-tower p-5 text-tower-foreground transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:w-[252px] lg:max-w-none lg:translate-x-0 lg:gap-7",
          open && "translate-x-0",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cerrar menú"
          className="ml-auto grid size-8 place-items-center rounded-lg text-tower-muted transition-colors hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X className="size-4" />
        </button>

        <Link href="/" className="group/logo flex items-center gap-2.5 px-2">
          <span className="grid size-[34px] flex-none place-items-center rounded-[10px] bg-primary transition-transform duration-500 group-hover/logo:-rotate-[14deg]">
            <PlaneIcon className="size-[18px]" />
          </span>
          <span className="text-[19px] leading-tight font-extrabold tracking-tight">
            VolAR
            <small className="block font-mono text-[10px] font-medium tracking-[0.16em] text-tower-muted uppercase">
              Administración
            </small>
          </span>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-2 px-3 text-sm font-semibold text-tower-muted transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Volver al inicio
        </Link>

        <AdminNav onNavigate={() => setOpen(false)} />

        <div className="mt-auto flex items-center gap-2.5 rounded-2xl bg-white/5 p-3 text-sm font-semibold">
          <span className="grid size-9 flex-none place-items-center rounded-full bg-tower-accent text-xs font-extrabold text-tower">
            {firstName?.[0]}
            {lastName?.[0]}
          </span>
          <span className="min-w-0">
            <span className="block truncate">
              {firstName} {lastName}
            </span>
            <small className="block text-xs font-medium text-tower-muted">Administrador</small>
          </span>
          <UserButton />
        </div>
      </aside>
    </>
  );
}
