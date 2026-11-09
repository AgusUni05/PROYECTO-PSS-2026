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
import type { FlightAuditTrail as FlightAuditTrailData } from "../queries";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_FIELD_LABELS,
  formatAuditTimestamp,
  formatAuditValue,
  type FlightAuditAction,
} from "../audit";

const ACTION_BADGE_VARIANTS: Record<FlightAuditAction, "success" | "outline" | "secondary"> = {
  CREATED: "success",
  UPDATED: "outline",
  CANCELLED: "secondary",
};

// US-43: historial inmutable de quién creó, modificó o canceló el vuelo.
export function FlightAuditTrail({ trail }: { trail: FlightAuditTrailData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de cambios ({trail.events.length})</CardTitle>
        <p className="text-sm text-muted-foreground">
          Vuelo creado por {trail.createdByName} el {formatAuditTimestamp(trail.createdAt)}.
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha y hora</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trail.events.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center whitespace-normal text-muted-foreground">
                    Sin eventos registrados. El vuelo se generó antes de que se habilitara la
                    auditoría y no tuvo cambios desde entonces.
                  </TableCell>
                </TableRow>
              )}
              {trail.events.map((event) => (
                <TableRow key={event.id} className="align-top">
                  <TableCell className="font-mono">{formatAuditTimestamp(event.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant={ACTION_BADGE_VARIANTS[event.action]} dot>
                      {AUDIT_ACTION_LABELS[event.action]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>{event.userName}</div>
                    <div className="text-xs text-muted-foreground">{event.userEmail}</div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <ul className="space-y-0.5">
                      {event.changes.map((change) => (
                        <li key={change.field}>
                          <span className="text-muted-foreground">
                            {AUDIT_FIELD_LABELS[change.field]}:
                          </span>{" "}
                          {event.action === "CREATED" ? (
                            formatAuditValue(change.field, change.to)
                          ) : (
                            <>
                              <s className="text-muted-foreground">
                                {formatAuditValue(change.field, change.from)}
                              </s>{" "}
                              → {formatAuditValue(change.field, change.to)}
                            </>
                          )}
                        </li>
                      ))}
                      {event.reason && (
                        <li>
                          <span className="text-muted-foreground">Motivo:</span> {event.reason}
                        </li>
                      )}
                    </ul>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
