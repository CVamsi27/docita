const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && EMAIL_REGEX.test(email.trim());
}
