export const validateClinicHours = (
  opening: number,
  closing: number,
): boolean => {
  return (
    Number.isFinite(opening) &&
    Number.isFinite(closing) &&
    opening >= 0 &&
    closing <= 24 &&
    opening < closing
  );
};

export const isValidPhoneNumber = (phone: string): boolean => {
  return /^\+?\d{10,15}$/.test(phone.replace(/[\s-]/g, ""));
};

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
