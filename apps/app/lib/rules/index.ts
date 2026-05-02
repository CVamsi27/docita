import {
  calculateAge as getAgeInYears,
  formatCurrency,
  isFuture,
  isPast,
  isToday,
} from "@workspace/utils";

export const dateRules = {
  isValidFutureDate: (date: Date | string): boolean => isFuture(date),

  isValidPastDate: (date: Date | string): boolean => isPast(date),

  isToday: (date: Date | string): boolean => isToday(date),

  isWithinBusinessHours: (
    date: Date,
    openingHour: number = 9,
    closingHour: number = 18,
  ): boolean => {
    const hour = date.getHours();
    return hour >= openingHour && hour < closingHour;
  },
};

export const validationRules = {
  isValidEmail: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  isValidPhone: (phone: string): boolean => {
    const cleaned = phone.replace(/[\s-()]/g, "");
    return /^\+?\d{10,15}$/.test(cleaned);
  },

  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  isNotEmpty: (value: string | null | undefined): boolean => {
    return value !== null && value !== undefined && value.trim().length > 0;
  },

  isMinLength: (value: string, min: number): boolean => {
    return value.trim().length >= min;
  },

  isMaxLength: (value: string, max: number): boolean => {
    return value.trim().length <= max;
  },
};

export const permissionRules = {
  canAccessFeature: (userRole: string, requiredRoles: string[]): boolean => {
    return requiredRoles.includes(userRole);
  },

  isAdmin: (userRole: string): boolean => {
    return userRole === "admin";
  },

  isDoctor: (userRole: string): boolean => {
    return userRole === "doctor";
  },

  canViewPatientData: (userRole: string): boolean => {
    return ["admin", "doctor", "nurse"].includes(userRole);
  },

  canModifySettings: (userRole: string): boolean => {
    return userRole === "admin";
  },
};

export const medicalRules = {
  calculateAge: (dateOfBirth: Date | string): number => {
    return getAgeInYears(dateOfBirth) ?? 0;
  },

  isMinor: (age: number): boolean => {
    return age < 18;
  },

  isSenior: (age: number): boolean => {
    return age >= 65;
  },

  calculateBMI: (weightKg: number, heightCm: number): number | null => {
    if (!weightKg || !heightCm) return null;
    const heightM = heightCm / 100;
    return parseFloat((weightKg / heightM ** 2).toFixed(1));
  },

  getBMICategory: (bmi: number): string => {
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal";
    if (bmi < 30) return "Overweight";
    return "Obese";
  },
};

export const formattingRules = {
  formatCurrency: (amount: number, currency: string = "INR"): string => {
    return formatCurrency(amount, {
      currency,
    });
  },

  formatPercentage: (value: number, decimals: number = 1): string => {
    return `${value.toFixed(decimals)}%`;
  },

  formatPhoneNumber: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
    }
    return phone;
  },

  capitalizeWords: (text: string): string => {
    return text.replace(/\b\w/g, (char) => char.toUpperCase());
  },
};
