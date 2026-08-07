import {
  FileCheck2,
  ShieldCheck,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

type AuthAssuranceItem = {
  icon: LucideIcon;
  labelKey: string;
};

export const AUTH_ASSURANCE_ITEMS: readonly AuthAssuranceItem[] = [
  {
    icon: ShieldCheck,
    labelKey: "footer.assurance.encryptedSessions",
  },
  {
    icon: FileCheck2,
    labelKey: "footer.assurance.auditReadyActivity",
  },
  {
    icon: Stethoscope,
    labelKey: "footer.assurance.facilityAwareAccess",
  },
] as const;