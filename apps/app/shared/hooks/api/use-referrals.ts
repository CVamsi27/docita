import { useAPIMutation, useAPIQuery } from "@/lib/api/api-core";

export const useReferralCode = () =>
  useAPIQuery<{
    code: string;
    referralLink: string;
  }>(["referral-code"], "/referrals/code", {
    staleTime: 1000 * 60 * 60,
  });

export const useReferralStats = () =>
  useAPIQuery<{
    totalReferrals: number;
    convertedReferrals: number;
    pendingReferrals: number;
    totalCreditsEarned: number;
    remainingCredits: number;
    maxCreditsPerYear: number;
  }>(["referral-stats"], "/referrals/my-stats", {
    staleTime: 1000 * 60 * 5,
  });

export const useReferralHistory = () =>
  useAPIQuery<
    {
      id: string;
      referredClinicName: string;
      status: string;
      creditMonths: number;
      convertedAt?: string;
      createdAt: string;
    }[]
  >(["referral-history"], "/referrals/my-history", {
    staleTime: 1000 * 60 * 5,
  });

export const useApplyReferralCode = () =>
  useAPIMutation<
    {
      success: boolean;
      discountPercent: number;
      referrerClinicName: string;
    },
    { referralCode: string; email?: string }
  >("/referrals/apply", "POST");

export const useValidateReferralCode = (code: string) =>
  useAPIQuery<{
    valid: boolean;
    referrerName?: string;
    discountPercent?: number;
  }>(["validate-referral", code], `/referrals/validate/${code}`, {
    enabled: !!code && code.length >= 6,
    staleTime: 1000 * 60,
  });
