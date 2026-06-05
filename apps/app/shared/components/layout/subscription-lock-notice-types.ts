import type { Clinic } from "@/lib/contexts/clinic-context";

export type NoticeKind =
  | "expired"
  | "paused"
  | "grace-or-past-due"
  | "trial-grace"
  | "trial-active"
  | "payment-required";

export interface SubscriptionLockNoticeCopy {
  kind: NoticeKind;
  title: string;
  description: string;
  ctaLabel: string;
  variant: "destructive" | "default";
  toneClass?: string;
  trialDaysLeft?: number | null;
}

export type ClinicShape = Pick<
  Clinic,
  "subscriptionStatus" | "tier" | "trialEndsAt" | "subscriptionGraceUntil"
>;
