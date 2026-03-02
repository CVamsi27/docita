

export const isValidFutureDate = (date: Date): boolean => {
  return date > new Date();
};

export const isValidPastDate = (date: Date): boolean => {
  return date < new Date();
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhoneNumber = (phone: string): boolean => {

  const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ""));
};

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
