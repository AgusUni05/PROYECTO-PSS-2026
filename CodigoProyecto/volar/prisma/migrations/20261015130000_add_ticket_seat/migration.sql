-- US-23: el pasaje electrónico guarda el asiento asignado al emitirse.
-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "seat" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tickets_flightId_seat_key" ON "tickets"("flightId", "seat");
