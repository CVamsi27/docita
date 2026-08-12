import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth/auth-context";
import { useClinicReferralShare } from "@/features/dashboard/hooks/use-clinic-referral-share";
import { DashboardHeaderUI } from "./dashboard-header-ui";
import { clinicWallHourMinuteFromUtcInstant, DEFAULT_TIMEZONE } from "@workspace/utils";

interface DashboardHeaderContainerProps {
  summary?: string;
  headerActions?: ReactNode;
}

export function DashboardHeaderContainer({
  summary,
  headerActions,
}: DashboardHeaderContainerProps) {
  const { t } = useTranslation("Dashboard");
  const { user } = useAuth();
  const {
    referralCode,
    publicOnlineBookingUrl,
    canQuickShareClinicCode,
    clinicName,
  } = useClinicReferralShare();

  const getGreeting = () => {
    const { hour } = clinicWallHourMinuteFromUtcInstant(new Date(), DEFAULT_TIMEZONE);
    if (hour < 12) return t("header.greetingMorning");
    if (hour < 17) return t("header.greetingAfternoon");
    return t("header.greetingEvening");
  };

  const displayName = (() => {
    const name = user?.name ?? "";
    if (!name || name.includes("@")) return t("header.defaultName");
    return name.split(" ")[0];
  })();

  return (
    <DashboardHeaderUI
      userName={displayName}
      greeting={getGreeting()}
      clinicCode={referralCode}
      clinicName={clinicName}
      publicOnlineBookingUrl={publicOnlineBookingUrl}
      canQuickShareClinicCode={canQuickShareClinicCode}
      summary={summary}
      headerActions={headerActions}
    />
  );
}
