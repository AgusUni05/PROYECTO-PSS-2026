import { prisma } from "@/lib/prisma";
import { STAFF_ROLES, staffFiltersSchema, type StaffFilters, type StaffRole } from "./schema";

export const STAFF_PAGE_SIZE = 10;

export type StaffListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: Date;
  createdBy: string | null;
};

/** US-31: listado filtrado y paginado de cuentas de personal (sin pasajeros), con resumen. */
export async function listStaff(rawFilters: Record<string, string | undefined>) {
  const filters: StaffFilters = staffFiltersSchema.parse(rawFilters);

  const where = {
    role: filters.rol === "todos" ? { in: [...STAFF_ROLES] } : filters.rol,
    ...(filters.estado === "activos" && { isActive: true }),
    ...(filters.estado === "inactivos" && { isActive: false }),
    ...(filters.q && {
      OR: [
        { firstName: { contains: filters.q, mode: "insensitive" as const } },
        { lastName: { contains: filters.q, mode: "insensitive" as const } },
        { email: { contains: filters.q, mode: "insensitive" as const } },
      ],
    }),
  };

  const [total, rows, activeAdmins, activeAgents, inactive] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (filters.page - 1) * STAFF_PAGE_SIZE,
      take: STAFF_PAGE_SIZE,
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    }),
    prisma.user.count({ where: { role: "ADMIN", isActive: true } }),
    prisma.user.count({ where: { role: "COUNTER_AGENT", isActive: true } }),
    prisma.user.count({ where: { role: { in: [...STAFF_ROLES] }, isActive: false } }),
  ]);

  const staff: StaffListItem[] = rows.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role as StaffRole,
    isActive: u.isActive,
    createdAt: u.createdAt,
    createdBy: u.createdBy ? `${u.createdBy.firstName} ${u.createdBy.lastName}`.trim() : null,
  }));

  return {
    staff,
    total,
    filters,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / STAFF_PAGE_SIZE)),
    summary: { activeAdmins, activeAgents, inactive },
  };
}
