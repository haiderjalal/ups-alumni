import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import nodemailer from "nodemailer";

import { getEnv } from "@/lib/env";

import type { EmailMessage, EmailTransport } from "./types";

const DEV_MAIL_DIR = ".dev-mail";

/**
 * Development-only transport. Writes each message to ./.dev-mail as JSON so that
 * verification and reset links can be opened locally. Blocked in production by env validation.
 */
class DevSinkTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<void> {
    await mkdir(DEV_MAIL_DIR, { recursive: true });
    const fileName = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.json`;
    await writeFile(path.join(DEV_MAIL_DIR, fileName), JSON.stringify(message, null, 2), "utf8");
  }
}

class SmtpTransport implements EmailTransport {
  private readonly transporter;

  constructor(options: {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    password?: string;
  }) {
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: options.user && options.password ? { user: options.user, pass: options.password } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: getEnv().EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}

let transport: EmailTransport | undefined;

/** Returns the configured transport. SMTP credentials are read here and nowhere else. */
export function getEmailTransport(): EmailTransport {
  if (transport) {
    return transport;
  }

  const env = getEnv();
  transport =
    env.EMAIL_DRIVER === "smtp"
      ? new SmtpTransport({
          host: env.SMTP_HOST ?? "",
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          user: env.SMTP_USER,
          password: env.SMTP_PASSWORD,
        })
      : new DevSinkTransport();

  return transport;
}
