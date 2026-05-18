"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useClinicSettings } from "@/hooks/api/use-settings";
import { getPublicAppOrigin } from "@/lib/constants/public-app-origin";

export function useClinicReferralShare() {
  const { user } = useAuth();
  const { clinic } = useClinic();
  const canQuickShareClinicCode =
    user?.role === "ADMIN" || user?.role === "ADMIN_DOCTOR";
  const { data: clinicSettings } = useClinicSettings({
    enabled: canQuickShareClinicCode,
  });

  const referralCode =
    clinicSettings?.referralCode ?? clinic?.referralCode ?? null;
  const publicOnlineBookingUrl = referralCode
    ? `${getPublicAppOrigin()}/book/${encodeURIComponent(referralCode)}`
    : null;
  const clinicName = clinicSettings?.name ?? clinic?.name;

  return {
    referralCode,
    publicOnlineBookingUrl,
    canQuickShareClinicCode,
    clinicName,
  };
}
