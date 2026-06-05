"use client";

import { PageTransitionLoader } from "@/components/loaders/page-transition-loader";
import { useApiAvailability } from "@/lib/api/api-availability";
import { useOptionalAuth } from "@/lib/auth/auth-context";

export function ApiAvailabilityOverlay() {
  const auth = useOptionalAuth();
  const { isUnavailable } = useApiAvailability();
  const isReconnecting = isUnavailable || auth?.isApiStarting === true;

  if (!isReconnecting) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-background">
      <PageTransitionLoader
        title="Reconnecting to Docita…"
        description="The secure workspace service is temporarily unavailable. We are reconnecting automatically. Keep this tab open; your current screen will be preserved."
      />
    </div>
  );
}
