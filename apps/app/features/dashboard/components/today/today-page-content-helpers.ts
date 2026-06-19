export interface TodayRailVisibilityInput {
  referralCode?: string | null;
  publicOnlineBookingUrl?: string | null;
  pendingJoinRequests: number;
  uncodedVisits: number;
  waitingCount: number;
}

export interface TodayRailVisibility {
  hasShareRailContent: boolean;
  hasAdvisorRailContent: boolean;
  showTodayRightColumn: boolean;
}

/**
 * Derives which right-rail sections (sharing toolbar / advisor tips) have
 * content to show — the rail itself only renders when at least one does.
 * Pulled out of `TodayPageContent` so the visibility rules are independently
 * testable and reusable if another surface needs the same rail.
 */
export function deriveTodayRailVisibility({
  referralCode,
  publicOnlineBookingUrl,
  pendingJoinRequests,
  uncodedVisits,
  waitingCount,
}: TodayRailVisibilityInput): TodayRailVisibility {
  const hasShareRailContent = Boolean(referralCode || publicOnlineBookingUrl);
  const hasAdvisorRailContent =
    pendingJoinRequests > 0 || uncodedVisits > 0 || waitingCount > 0;
  return {
    hasShareRailContent,
    hasAdvisorRailContent,
    showTodayRightColumn: hasShareRailContent || hasAdvisorRailContent,
  };
}
