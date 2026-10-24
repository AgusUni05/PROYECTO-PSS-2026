import nodemailer from "nodemailer";

type MailerConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
};

function loadMailerConfig(): MailerConfig {
  const missing: string[] = [];

  const host = process.env.SMTP_HOST;
  if (!host) missing.push("SMTP_HOST");

  const portRaw = process.env.SMTP_PORT;
  if (!portRaw) missing.push("SMTP_PORT");

  const user = process.env.SMTP_USER;
  if (!user) missing.push("SMTP_USER");

  const password = process.env.SMTP_PASSWORD;
  if (!password) missing.push("SMTP_PASSWORD");

  const from = process.env.MAIL_FROM;
  if (!from) missing.push("MAIL_FROM");

  if (missing.length > 0) {
    throw new Error(`Falta configuración SMTP: ${missing.join(", ")}`);
  }

  const port = Number(portRaw);
  if (Number.isNaN(port)) {
    throw new Error("SMTP_PORT no es un número válido");
  }

  const secure = process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1";

  return { host: host!, port, secure, user: user!, password: password!, from: from! };
}

export function createMailerTransport() {
  const cfg = loadMailerConfig();

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.password,
    },
  });
}
