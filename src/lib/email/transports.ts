import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Resend } from "resend";

import { getEnv } from "@/lib/env";

import type { EmailMessage, EmailTransport, SendOptions } from "./types";

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

/**
 * Production transport for Resend. The sender address must belong to a domain verified in Resend.
 * Failures are rethrown with the provider's error name only, so recipient details never reach the outbox or logs.
 */
class ResendTransport implements EmailTransport {
  private readonly client: Resend;

  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }

  async send(message: EmailMessage, options?: SendOptions): Promise<void> {
    const { error } = await this.client.emails.send(
      {
        from: getEnv().EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      },
      options?.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined,
    );

    if (error) {
      const failure = new Error(error.message);
      failure.name = error.name;
      throw failure;
    }
  }
}

let transport: EmailTransport | undefined;

/** Returns the configured transport. The Resend API key is read here and nowhere else. */
export function getEmailTransport(): EmailTransport {
  if (transport) {
    return transport;
  }

  const env = getEnv();
  transport =
    env.EMAIL_DRIVER === "resend"
      ? new ResendTransport(env.RESEND_API_KEY ?? "")
      : new DevSinkTransport();

  return transport;
}
