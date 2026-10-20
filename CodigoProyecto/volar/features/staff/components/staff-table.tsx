import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationLinks } from "@/components/pagination-links";
import { formatDate } from "@/features/flights/format";
import type { StaffListItem } from "../queries";
import { STAFF_ROLE_LABELS, type StaffFilters } from "../schema";
import { ChangeRoleButton } from "./change-role-button";
import { StaffStatusButton } from "./staff-status-button";

type Props = {
  staff: StaffListItem[];
  total: number;
  page: number;
  pageCount: number;
  filters: StaffFilters;
  /** Id del admin logueado: su propia fila no tiene acciones (no puede auto-deshabilitarse). */
  currentUserId: string;
};

// US-31: listado de cuentas de personal con filtros/paginación y acciones por fila.
export function StaffTable({ staff, total, page, pageCount, filters, currentUserId }: Props) {
  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.rol !== "todos") params.set("rol", filters.rol);
    if (filters.estado !== "todos") params.set("estado", filters.estado);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return `/admin/personal${qs ? `?${qs}` : ""}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Registrado (Total: {total})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre y Apellido</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Alta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Sin resultados para los filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
              {staff.map((u) => {
                const name = `${u.firstName} ${u.lastName}`.trim() || u.email;
                const isSelf = u.id === currentUserId;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {name}
                      {isSelf && (
                        <Badge variant="outline" className="ml-2">
                          Vos
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                        {STAFF_ROLE_LABELS[u.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(u.createdAt)}
                      {u.createdBy && <span className="block text-xs">por {u.createdBy}</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? "success" : "secondary"} dot>
                        {u.isActive ? "Activa" : "Deshabilitada"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isSelf ? (
                        <p className="text-right text-xs text-muted-foreground">Tu cuenta</p>
                      ) : (
                        <div className="flex flex-wrap justify-end gap-2">
                          {u.isActive && <ChangeRoleButton id={u.id} label={name} role={u.role} />}
                          <StaffStatusButton id={u.id} label={name} isActive={u.isActive} />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <PaginationLinks page={page} pageCount={pageCount} buildHref={buildHref} />
      </CardContent>
    </Card>
  );
}
