/**
 * Expected mentorship failures (validation, capacity, state conflicts). Messages are written for members
 * and are safe to show in the UI. Other errors are logged and replaced with a generic message.
 */
export class MentorshipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MentorshipError";
  }
}
