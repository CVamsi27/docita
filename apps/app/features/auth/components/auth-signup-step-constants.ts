export const SIGNUP_OWNER_ROLE_VALUES = ["ADMIN", "ADMIN_DOCTOR"] as const;

export const OWNER_ROLE_OPTIONS = [
  {
    value: "ADMIN_DOCTOR" as const,
    roleLabel: "Admin Doctor",
    title: "Yes, I'll also see patients",
    description:
      "Use consultations, prescriptions, notes, and facility management from the same owner account",
    helper:
      "This creates an Admin Doctor account with clinical and facility-management access",
    badge: "Recommended",
  },
  {
    value: "ADMIN" as const,
    roleLabel: "Admin",
    title: "No, I'll only manage the facility",
    description:
      "Use billing, facility setup, team management, and operational tools without doctor workflows",
    helper:
      "This creates an Admin account focused on facility operations and staff management",
    badge: undefined,
  },
] as const;
