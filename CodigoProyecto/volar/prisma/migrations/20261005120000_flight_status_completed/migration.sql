-- AlterEnum
-- Los vuelos que ya partieron se pasan a COMPLETED desde la aplicación
-- (features/flights/status.ts), por eso no hace falta un UPDATE acá.
ALTER TYPE "FlightStatus" ADD VALUE 'COMPLETED' AFTER 'SCHEDULED';
