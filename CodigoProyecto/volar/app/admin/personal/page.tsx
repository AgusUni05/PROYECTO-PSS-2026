import { ListNavigationProvider, ListResults } from "@/components/list-navigation";
import { TableSkeleton } from "@/components/table-skeleton";
import Link from "next/link";
import { Info } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { StaffForm } from "@/features/staff/components/staff-form";
import { StaffFilters } from "@/features/staff/components/staff-filters";
import { StaffTable } from "@/features/staff/components/staff-table";
import { listStaff } from "@/features/staff/queries";

type SearchParams = { q?: string; rol?: string; estado?: string; page?: string };

// US-31: Gestión de Cuentas de Personal (gestion_personal.html).
export default async function PersonalPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const admin = await requireAdmin();
  const { staff, total, page, pageCount, filters, summary } = await listStaff(await searchParams);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Administración &gt; Seguridad y Personal &gt;{" "}
        <span className="font-medium text-foreground">Gestión de Cuentas de Personal</span>
      </p>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Gestión de Cuentas de Personal
          </h1>
          <p className="text-sm text-muted-foreground">
            Alta, cambio de rol y deshabilitación de cuentas de Administradores y Empleados de
            Mostrador.
          </p>
        </div>
        <Link href="#form-personal" className={buttonVariants()}>
          + Nueva Cuenta de Personal
        </Link>
      </div>

      <div className="flex items-start gap-3.5 rounded-2xl bg-secondary p-4 text-[#2E1A8F]">
        <span className="grid size-[34px] flex-none place-items-center rounded-[10px] bg-card text-primary">
          <Info className="size-[18px]" />
        </span>
        <div>
          <b className="block text-[13.5px]">Regla integrada</b>
          <p className="m-0 text-[13.5px] leading-[1.55] text-[#3D3470]">
            Exclusivo para administradores. Una cuenta deshabilitada no puede iniciar sesión, pero
            no se borra: se conserva la trazabilidad de todas sus operaciones. No podés
            deshabilitar ni cambiar el rol de tu propia cuenta.
          </p>
        </div>
      </div>

      <ListNavigationProvider>
        <div className="grid gap-6 lg:grid-cols-2">
          <StaffForm />
          <StaffFilters filters={filters} summary={summary} />
        </div>

        <ListResults skeleton={<TableSkeleton columns={6} />}>
          <StaffTable
            staff={staff}
            total={total}
            page={page}
            pageCount={pageCount}
            filters={filters}
            currentUserId={admin.id}
          />
        </ListResults>
      </ListNavigationProvider>
    </div>
  );
}
