-- US-41: valijas adicionales en bodega que el pasajero compró al hacer el check-in.
-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "extraBags" INTEGER NOT NULL DEFAULT 0;
