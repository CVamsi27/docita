

export const isValidFutureDate = (date: Date): boolean => {
  return date > new Date();
};

export const isValidPastDate = (date: Date): boolean => {
  return date < new Date();
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
