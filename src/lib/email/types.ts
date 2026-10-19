export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendOptions {
  /**
   * Stable per logical message (the outbox row id). Providers that support it return the original result for a
   * retried request instead of sending the message again.
   */
  idempotencyKey?: string;
}

/** A transport delivers one message. Implementations must throw on failure so the outbox can retry. */
export interface EmailTransport {
  send(message: EmailMessage, options?: SendOptions): Promise<void>;
}
