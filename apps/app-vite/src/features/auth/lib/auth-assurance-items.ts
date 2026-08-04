import {
  FileCheck2,
  ShieldCheck,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

type AuthAssuranceItem = {
  icon: LucideIcon;
  label: string;
};

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