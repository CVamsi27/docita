import { Building2, FileCheck2, KeyRound, UserCheck, type LucideIcon } from "lucide-react";
import type { AuthBrandingStep } from "../types/auth";

interface SetupStep {
  icon: LucideIcon;
  title: string;
  description: string;
  authSteps: readonly AuthBrandingStep[];
}

export const setupSteps: readonly SetupStep[] = [
  {
    icon: FileCheck2,
    title: "Set up your account",
    description: "Enter your details or sign in to continue",
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
    title: "Verify access",
    description: "Confirm your email before moving ahead",
    authSteps: ["verify-email", "verify-email-sent"],
  },
  {
    icon: Building2,
    title: "Choose your path",
    description: "Create a new facility or join an existing one",
    authSteps: ["choose-path"],
  },
  {
    icon: UserCheck,
    title: "Complete setup",
    description: "Finish onboarding, team setup, and profile verification",
    authSteps: [
      "onboarding",
      "join-clinic",
      "join-request-status",
      "verify-doctor",
    ],
  },
];
