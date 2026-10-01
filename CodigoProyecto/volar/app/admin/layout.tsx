import { requireAdmin } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin-sidebar";

// US-30: solo ADMIN entra al panel (requireAdmin redirige o corta con 403).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
      <AdminSidebar firstName={user.firstName} lastName={user.lastName} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-7 lg:pb-14">{children}</main>
    </div>
  );
}
