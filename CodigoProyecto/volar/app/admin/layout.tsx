import { UserButton } from "@clerk/nextjs";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";

// US-30: solo ADMIN entra al panel (requireAdmin redirige o corta con 403).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-[var(--tower-border)] bg-[var(--tower)] text-[var(--tower-foreground)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="font-heading text-lg font-semibold tracking-tight">VolAR</span>
            <span className="font-mono text-[0.6875rem] tracking-[0.2em] text-[var(--tower-foreground)]/60 uppercase">
              Panel Administración
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[var(--tower-foreground)]/80 sm:inline">
              {user.firstName} {user.lastName}
            </span>
            <UserButton />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-3">
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
