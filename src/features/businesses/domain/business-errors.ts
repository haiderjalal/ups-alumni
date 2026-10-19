/**
 * Expected business failures (validation, ownership, state conflicts). Messages are written for members
 * and are safe to show in the UI. Any other error is logged and replaced with a generic message.
 */
export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessError";
  }
}
