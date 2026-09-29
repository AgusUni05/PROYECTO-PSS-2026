/**
 * Promueve un usuario existente (ya logueado al menos una vez, para que su
 * fila en `users` exista) al rol ADMIN.
 *
 * Uso: pnpm make-admin correo@ejemplo.com
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Uso: pnpm make-admin <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(
      `No existe un usuario con email ${email}. Iniciá sesión al menos una vez en la app antes de promoverlo.`,
    );
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
  });

  console.log(`OK: ${updated.email} ahora es ADMIN.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
