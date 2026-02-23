/**
 * Formatting Utilities
 * Date, currency, phone number formatters, etc.
 */

/**
 * Format date to readable format
 */
export function formatDate(
  date: Date | string,
  locale: string = "en-IN",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale);
}

/**
 * Format date and time
 */
export function formatDateTime(
  date: Date | string,
  locale: string = "en-IN",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(locale);
}

/**
 * Format currency in INR
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) return phone;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number = 50): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert to title case
 */
export function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ");
}
