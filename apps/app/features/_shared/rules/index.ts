/**
 * Shared Business Rules
 *
 * Cross-cutting business rules used across multiple feature modules.
 * Keep feature-specific rules in their respective feature folders.
 */

/**
 * Date & Time Rules
 */
export const isValidFutureDate = (date: Date): boolean => {
  return date > new Date();
};

export const isValidPastDate = (date: Date): boolean => {
  return date < new Date();
};

/**
 * Validation Rules
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhoneNumber = (phone: string): boolean => {
  // Indian phone number format: +91 followed by 10 digits
  const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ""));
};

/**
 * Permission Rules
 *
 * Basic permission checks. For complex access control,
 * see @/lib/access-control
 */
export const canUserAccessFeature = (
  userRole: string,
  feature: string,
): boolean => {
  const roleFeatureMap: Record<string, string[]> = {
    admin: ["all"],
    doctor: ["patients", "appointments", "prescriptions", "consultation"],
    receptionist: ["appointments", "patients", "queue", "invoices"],
    pharmacist: ["prescriptions", "inventory"],
  };

  const allowedFeatures = roleFeatureMap[userRole] || [];
  return allowedFeatures.includes("all") || allowedFeatures.includes(feature);
};
