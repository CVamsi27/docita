"use client";

import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useI18n } from "@/lib/i18n/provider";

export function OfflineStatusBanner() {
  const { isOffline } = useNetworkStatus();
  const { t } = useI18n();

  if (!isOffline) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-2 border-b border-border bg-destructive/10 px-4 py-2 text-sm text-foreground"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="h-4 w-4 text-destructive" />
      <span>{t("offlineBanner")}</span>
    </div>
  );
}
