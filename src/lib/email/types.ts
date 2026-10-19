export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** A transport delivers one message. Implementations must throw on failure so the outbox can retry. */
export interface EmailTransport {
  send(message: EmailMessage): Promise<void>;
}
