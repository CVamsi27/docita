/**
 * Shared Utility Functions
 *
 * Common helper functions used across feature modules.
 */

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }

  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }

  return phone;
};

/**
 * Generate initials from name
 */
export const getInitials = (firstName: string, lastName?: string): string => {
  if (!firstName) return "";

  const first = firstName.charAt(0).toUpperCase();
  const last = lastName ? lastName.charAt(0).toUpperCase() : "";

  return `${first}${last}`;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

/**
 * Debounce function utility
 */
export function debounce<
  T extends (
    ...args: Array<string | number | Record<string, unknown>>
  ) => void | Promise<void>,
>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Format currency for display
 */
export const formatCurrency = (
  amount: number,
  currency: string = "INR",
): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};
