import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AdminRuleNotice } from "@/components/admin-rule-notice";
import { idSchema } from "@/lib/id";
import { getFlightAuditTrail } from "@/features/flights/queries";
import { FlightAuditTrail } from "@/features/flights/components/flight-audit-trail";
import { formatDate } from "@/features/flights/format";

// US-43: auditoría de un vuelo — quién lo creó, modificó o canceló, con fecha y detalle.
export default async function FlightHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!idSchema("Flight").safeParse(id).success) notFound();

  const trail = await getFlightAuditTrail(id);
  if (!trail) notFound();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Administración &gt; Operaciones &gt; Vuelos &gt;{" "}
        <span className="font-medium text-foreground">Historial</span>
      </p>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Historial del vuelo <span className="font-mono">{trail.code}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {trail.originCode} → {trail.destinationCode} · {formatDate(trail.date)}
          </p>
        </div>
        <Link href="/admin/vuelos" className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft />
          Volver a vuelos
        </Link>
      </div>

      <AdminRuleNotice title="Registro inmutable">
        Cada creación, modificación y cancelación del vuelo queda registrada con el usuario, la fecha
        y hora, y los valores anteriores y nuevos. Los eventos no se pueden editar ni borrar.
      </AdminRuleNotice>

      <FlightAuditTrail trail={trail} />
    </div>
  );
}
