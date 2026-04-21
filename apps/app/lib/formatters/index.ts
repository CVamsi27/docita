
import { DEFAULT_CURRENCY } from "@workspace/utils";
export { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";


export function formatDate(
  date: Date | string,
  locale: string = "en-IN",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale);
}

export function formatDateTime(
  date: Date | string,
  locale: string = "en-IN",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(locale);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: DEFAULT_CURRENCY,
  }).format(amount);
}

export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) return phone;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function truncate(text: string, length: number = 50): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function toTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ");
}
