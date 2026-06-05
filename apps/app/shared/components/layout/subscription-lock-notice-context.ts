import {
  mapDbClinicTierStringToTierName,
  TRIAL_GRACE_DAYS,
} from "@workspace/types";
import { formatDate } from "@/lib/formatters";
import { getTierInfo } from "@/lib/subscription/tier-access";
import {
  getTrialState,
  isPastSubscriptionGraceDeadline,
} from "@/lib/subscription/subscription-lockout";
import type { ClinicShape } from "./subscription-lock-notice-types";

const DAY_MS = 1000 * 60 * 60 * 24;

export interface SubscriptionNoticeContext {
  trialTierLabel: string;
  trialEndText: string | null;
  trialDaysLeft: number | null;
  trialGraceDaysLeft: number | null;
  graceUntilText: string | null;
  pastGraceDeadline: boolean;
  isTrialGrace: boolean;
}

export function buildSubscriptionNoticeContext(
  clinic: ClinicShape,
): SubscriptionNoticeContext {
  const trialEnd = readDate(clinic.trialEndsAt);
  return {
    trialTierLabel: resolveTrialTierLabel(clinic),
    trialEndText: formatValidDate(trialEnd),
    trialDaysLeft: computeDaysLeft(trialEnd),
    trialGraceDaysLeft: computeDaysLeftWithGrace(trialEnd),
    graceUntilText: formatValidDate(readDate(clinic.subscriptionGraceUntil)),
    pastGraceDeadline: isPastSubscriptionGraceDeadline(clinic),
    isTrialGrace: getTrialState(clinic) === "GRACE",
  };
}

function resolveTrialTierLabel(clinic: ClinicShape): string {
  return clinic.tier && typeof clinic.tier === "string"
    ? getTierInfo(mapDbClinicTierStringToTierName(clinic.tier)).name
    : "subscription";
}

function readDate(value: string | Date | null | undefined): Date | null {
  return value == null ? null : new Date(value);
}

function formatValidDate(value: Date | null): string | null {
  return value && Number.isFinite(value.getTime()) ? formatDate(value) : null;
}

function computeDaysLeft(value: Date | null): number | null {
  return value && Number.isFinite(value.getTime())
    ? Math.max(0, Math.ceil((value.getTime() - Date.now()) / DAY_MS))
    : null;
}

function computeDaysLeftWithGrace(value: Date | null): number | null {
  return value && Number.isFinite(value.getTime())
    ? Math.max(
        0,
        Math.ceil(
          (value.getTime() + TRIAL_GRACE_DAYS * DAY_MS - Date.now()) / DAY_MS,
        ),
      )
    : null;
}
