-- US-43: auditoría inmutable de vuelos (quién creó, modificó o canceló cada vuelo).
-- CreateEnum
CREATE TYPE "FlightAuditAction" AS ENUM ('CREATED', 'UPDATED', 'CANCELLED');

-- CreateTable
CREATE TABLE "flight_audit_events" (
    "id" TEXT NOT NULL,
    "flightId" TEXT NOT NULL,
    "action" "FlightAuditAction" NOT NULL,
    "changes" JSONB NOT NULL,
    "reason" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flight_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flight_audit_events_flightId_createdAt_idx" ON "flight_audit_events"("flightId", "createdAt");

-- AddForeignKey
ALTER TABLE "flight_audit_events" ADD CONSTRAINT "flight_audit_events_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "flights"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_audit_events" ADD CONSTRAINT "flight_audit_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- El registro de auditoría es inmutable: la base rechaza cualquier UPDATE o
-- DELETE sobre la tabla, venga de la aplicación o de una consulta manual.
CREATE FUNCTION "flight_audit_events_immutable"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'flight_audit_events es inmutable: no se permite %', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "flight_audit_events_no_update_delete"
BEFORE UPDATE OR DELETE ON "flight_audit_events"
FOR EACH ROW EXECUTE FUNCTION "flight_audit_events_immutable"();
