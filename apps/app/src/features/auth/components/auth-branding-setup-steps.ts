import { Building2, FileCheck2, KeyRound, UserCheck, type LucideIcon } from "lucide-react";
import type { AuthBrandingStep } from "../types/auth";

interface SetupStep {
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
  authSteps: readonly AuthBrandingStep[];
}

export const setupSteps: readonly SetupStep[] = [
  {
    icon: FileCheck2,
    titleKey: "setupSteps.account.title",
    descriptionKey: "setupSteps.account.description",
    authSteps: [
      "email",
      "login",
      "signup",
      "forgot-password",
      "reset-password",
    ],
  },
  {
    icon: KeyRound,
    titleKey: "setupSteps.verify.title",
    descriptionKey: "setupSteps.verify.description",
    authSteps: ["verify-email", "verify-email-sent"],
  },
  {
    icon: Building2,
    titleKey: "setupSteps.path.title",
    descriptionKey: "setupSteps.path.description",
    authSteps: ["choose-path"],
  },
  {
    icon: UserCheck,
    titleKey: "setupSteps.setup.title",
    descriptionKey: "setupSteps.setup.description",
    authSteps: [
      "onboarding",
      "join-clinic",
      "join-request-status",
      "verify-doctor",
    ],
  },
];
