import "dotenv/config";
import { createMailerTransport } from "../lib/mailer";

async function main() {
  const transport = createMailerTransport();
  await transport.verify();
  console.log("Conexión SMTP verificada correctamente.");
}

main().catch((error) => {
  console.error("No se pudo verificar la conexión SMTP:", error);
  process.exit(1);
});
