import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));
vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    EMAIL_DRIVER: "resend",
    EMAIL_FROM: "UPS Alumni Network <no-reply@example.com>",
    RESEND_API_KEY: "re_test_key_1234567890",
  }),
}));

import { getEmailTransport } from "./transports";

const MESSAGE = { to: "member@example.com", subject: "Verify", text: "Open the link." };

describe("Resend transport", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("sends from the configured sender and passes the idempotency key", async () => {
    sendMock.mockResolvedValue({ data: { id: "email_1" }, error: null });

    await getEmailTransport().send(MESSAGE, { idempotencyKey: "outbox-row-1" });

    expect(sendMock).toHaveBeenCalledWith(
      { from: "UPS Alumni Network <no-reply@example.com>", to: MESSAGE.to, subject: MESSAGE.subject, text: MESSAGE.text },
      { idempotencyKey: "outbox-row-1" },
    );
  });

  it("omits the idempotency header when no key is given", async () => {
    sendMock.mockResolvedValue({ data: { id: "email_2" }, error: null });

    await getEmailTransport().send(MESSAGE);

    expect(sendMock).toHaveBeenCalledWith(expect.any(Object), undefined);
  });

  it("throws the provider error name so the outbox can record it without recipient details", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "The sender domain is not verified." },
    });

    await expect(getEmailTransport().send(MESSAGE)).rejects.toMatchObject({ name: "validation_error" });
  });
});
