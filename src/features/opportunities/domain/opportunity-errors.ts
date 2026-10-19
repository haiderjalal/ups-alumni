/**
 * Expected opportunity failures. Messages are written for members and are safe to show in the UI.
 * Other errors are logged and replaced with a generic message by the action layer.
 */
export class OpportunityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpportunityError";
  }
}
