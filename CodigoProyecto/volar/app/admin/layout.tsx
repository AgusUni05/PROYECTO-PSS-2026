import { UserButton } from "@clerk/nextjs";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";

// US-30: solo ADMIN entra al panel (requireAdmin redirige o corta con 403).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="grid min-h-full flex-1 grid-cols-[252px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-7 bg-tower p-5 text-tower-foreground">
        <div className="flex items-center gap-2.5 px-2">
          <span className="grid size-[34px] place-items-center rounded-[10px] bg-primary">
            <PlaneIcon className="size-[18px]" />
          </span>
          <span className="text-[19px] leading-tight font-extrabold tracking-tight">
            VolAR
            <small className="block font-mono text-[10px] font-medium tracking-[0.16em] text-tower-muted uppercase">
              Administración
            </small>
          </span>
        </div>

        <AdminNav />

        <div className="mt-auto flex items-center gap-2.5 rounded-2xl bg-white/5 p-3 text-sm font-semibold">
          <span className="grid size-9 flex-none place-items-center rounded-full bg-tower-accent text-xs font-extrabold text-tower">
            {user.firstName?.[0]}
            {user.lastName?.[0]}
          </span>
          <span className="min-w-0">
            <span className="block truncate">
              {user.firstName} {user.lastName}
            </span>
            <small className="block text-xs font-medium text-tower-muted">Administrador</small>
          </span>
          <UserButton />
        </div>
      </aside>

      <main className="min-w-0 px-10 py-7 pb-14">{children}</main>
    </div>
  );
}

function PlaneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}
