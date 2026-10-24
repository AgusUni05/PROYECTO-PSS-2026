import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createMailerTransport } from "./index";

describe("createMailerTransport", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("crea un transporte SMTP cuando la configuración está completa", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_SECURE = "false";
    process.env.SMTP_USER = "user@example.com";
    process.env.SMTP_PASSWORD = "secret";
    process.env.MAIL_FROM = "from@example.com";

    const transport = createMailerTransport();

    expect(transport).toBeDefined();
  });

  it.each([
    ["SMTP_HOST"],
    ["SMTP_PORT"],
    ["SMTP_USER"],
    ["SMTP_PASSWORD"],
    ["MAIL_FROM"],
  ])("falla con mensaje claro si falta %s", (key) => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_SECURE = "false";
    process.env.SMTP_USER = "user@example.com";
    process.env.SMTP_PASSWORD = "secret";
    process.env.MAIL_FROM = "from@example.com";

    delete (process.env as Record<string, string | undefined>)[key];

    expect(() => createMailerTransport()).toThrow(/Falta configuración SMTP/);
    expect(() => createMailerTransport()).toThrow(new RegExp(key));
  });

  it("falla si SMTP_PORT no es un número válido", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "not-a-number";
    process.env.SMTP_SECURE = "false";
    process.env.SMTP_USER = "user@example.com";
    process.env.SMTP_PASSWORD = "secret";
    process.env.MAIL_FROM = "from@example.com";

    expect(() => createMailerTransport()).toThrow("SMTP_PORT no es un número válido");
  });
});
