-- US-38: el pasaje guarda cuándo se hizo el check-in online (null si no se hizo).
-- Columna opcional: el código ya desplegado sigue funcionando con o sin ella.
-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "checkedInAt" TIMESTAMP(3);
