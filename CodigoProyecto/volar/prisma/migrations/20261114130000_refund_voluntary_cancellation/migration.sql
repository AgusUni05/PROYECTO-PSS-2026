-- US-39: cancelación voluntaria. Motivo elegido por el pasajero e importe
-- retenido por la política de penalidades. Columnas opcionales: los reembolsos
-- por contingencia (US-26) las dejan en null y el código ya desplegado sigue
-- funcionando con o sin ellas.
-- AlterTable
ALTER TABLE "refunds" ADD COLUMN     "penaltyAmount" DECIMAL(12,2),
ADD COLUMN     "reason" TEXT;
