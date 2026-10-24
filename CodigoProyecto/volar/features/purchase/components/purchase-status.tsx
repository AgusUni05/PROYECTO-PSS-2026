import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/generated/prisma/enums";

type BadgeVariant = "success" | "secondary" | "destructive" | "warning" | "outline";

function statusDisplay(
  status: BookingStatus,
  past: boolean,
): { label: string; variant: BadgeVariant } {
  switch (status) {
    case "CONFIRMED":
      return past
        ? { label: "Viaje completado", variant: "secondary" }
        : { label: "Confirmada", variant: "success" };
    case "CANCELLED":
      return { label: "Cancelada", variant: "destructive" };
    case "PENDING_PAYMENT":
      return { label: "Pendiente de pago", variant: "warning" };
    case "EXPIRED":
      return { label: "Vencida", variant: "outline" };
    case "REJECTED":
      return { label: "Rechazada", variant: "destructive" };
  }
}

/**
 * US-35: estado de una compra. El texto siempre acompaña al color, así el
 * estado no depende únicamente de la variante visual.
 */
export function PurchaseStatus({
  status,
  past = false,
}: {
  status: BookingStatus;
  past?: boolean;
}) {
  const { label, variant } = statusDisplay(status, past);

  return (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
}
