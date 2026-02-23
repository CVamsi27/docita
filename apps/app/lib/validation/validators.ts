/**
 * Common Validation Utilities
 * Reusable validation functions
 */

/**
 * Email validation
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Phone number validation (Indian format)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\D/g, ""));
}

/**
 * At least one character
 */
export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Minimum length validation
 */
export function hasMinLength(value: string, minLength: number): boolean {
  return value.length >= minLength;
}

/**
 * Maximum length validation
 */
export function hasMaxLength(value: string, maxLength: number): boolean {
  return value.length <= maxLength;
}

/**
 * Required field validators
 */
export const validators = {
  email: (email: string) => {
    if (!isNotEmpty(email)) return "Email is required";
    if (!isValidEmail(email)) return "Invalid email address";
    return null;
  },

  phone: (phone: string) => {
    if (!isNotEmpty(phone)) return "Phone number is required";
    if (!isValidPhoneNumber(phone)) return "Invalid phone number";
    return null;
  },

  password: (password: string) => {
    if (!isNotEmpty(password)) return "Password is required";
    if (!hasMinLength(password, 8))
      return "Password must be at least 8 characters";
    return null;
  },

  required: (value: string, fieldName: string) => {
    if (!isNotEmpty(value)) return `${fieldName} is required`;
    return null;
  },
};
