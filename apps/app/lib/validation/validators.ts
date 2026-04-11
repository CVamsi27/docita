

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\D/g, ""));
}

export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function hasMinLength(value: string, minLength: number): boolean {
  return value.length >= minLength;
}

export function hasMaxLength(value: string, maxLength: number): boolean {
  return value.length <= maxLength;
}

export const validators = {
  email: (email: string) => {
    if (!isNotEmpty(email)) return "Enter an email address.";
    if (!isValidEmail(email)) return "Please enter a valid email address";
    return null;
  },

  phone: (phone: string) => {
    if (!isNotEmpty(phone)) return "Enter a phone number.";
    if (!isValidPhoneNumber(phone)) return "Enter a valid phone number.";
    return null;
  },

  password: (password: string) => {
    if (!isNotEmpty(password)) return "Enter a password.";
    if (!hasMinLength(password, 8)) return "Use at least 8 characters.";
    return null;
  },

  required: (value: string, fieldName: string) => {
    if (!isNotEmpty(value)) return `Enter ${fieldName.toLowerCase()}.`;
    return null;
  },
};
