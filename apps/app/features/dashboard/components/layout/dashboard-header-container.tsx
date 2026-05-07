import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
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
  const { user } = useAuth();
  const {
    referralCode,
    publicOnlineBookingUrl,
    canQuickShareClinicCode,
    clinicName,
  } = useClinicReferralShare();

  const getGreeting = () => {
    const { hour } = clinicWallHourMinuteFromUtcInstant(new Date(), DEFAULT_TIMEZONE);
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const displayName = (() => {
    const name = user?.name ?? "";
    if (!name || name.includes("@")) return "Doctor";
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
