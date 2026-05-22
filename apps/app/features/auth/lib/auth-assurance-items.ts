import {
  FileCheck2,
  ShieldCheck,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

export type AuthAssuranceItem = {
  icon: LucideIcon;
  label: string;
};

/** Shared trust copy for auth branding rail and mobile pre-dashboard footer. */
export const AUTH_ASSURANCE_ITEMS: readonly AuthAssuranceItem[] = [
  {
    icon: ShieldCheck,
    label: "Encrypted sessions",
  },
  {
    icon: FileCheck2,
    label: "Audit-ready activity",
  },
  {
    icon: Stethoscope,
    label: "Facility-aware access",
  },
] as const;
