"use client";

import { isAdmin } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useClinicSettings } from "@workspace/data-access";
import { getPublicBookingUrl } from "@/lib/constants/public-app-origin";

export function useClinicReferralShare() {
  const { user } = useAuth();
  const { clinic } = useClinic();
  const canQuickShareClinicCode = isAdmin(user?.role);
  const { data: clinicSettings } = useClinicSettings({
    enabled: canQuickShareClinicCode,
  });

  const referralCode =
    clinicSettings?.referralCode ?? clinic?.referralCode ?? null;
  const publicOnlineBookingUrl = referralCode
    ? getPublicBookingUrl(referralCode)
    : null;
  const clinicName = clinicSettings?.name ?? clinic?.name;

  return {
    referralCode,
    publicOnlineBookingUrl,
    canQuickShareClinicCode,
    clinicName,
  };
}
