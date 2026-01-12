/**
 * Settings Business Rules
 */

export const validateClinicHours = (
  opening: number,
  closing: number,
): boolean => {
  return opening < closing && opening >= 0 && closing <= 24;
};

export const isValidPhoneNumber = (phone: string): boolean => {
  return /^\+?\d{10,15}$/.test(phone.replace(/[\s-]/g, ""));
};

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
