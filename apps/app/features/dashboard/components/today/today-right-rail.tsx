"use client";

// jscpd:ignore-start
import {
  TodayRightRailSection,
} from "./today-page-content-sections";

interface TodayRightRailProps {
  hasShareRailContent: boolean;
  hasAdvisorRailContent: boolean;
  referralCode?: string | null;
  clinicName?: string | null;
  publicOnlineBookingUrl?: string | null;
  canQuickShareClinicCode: boolean;
  pendingJoinRequests: number;
  pendingReports: number;
  waitingCount: number;
}

export function TodayRightRail(props: TodayRightRailProps) {
// jscpd:ignore-end
  return <TodayRightRailSection {...props} />;
}
