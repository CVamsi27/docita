import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ServerWarmingScreen as SharedServerWarmingScreen } from "@workspace/ui/components/feedback/server-warming-screen";
import { useApiAvailability } from "@/lib/api/api-availability";
import { useNetworkStatus } from "@workspace/data-access";

/** After roughly a minute of failed probes the copy stops promising "a few seconds". */
const SLOW_START_ATTEMPT_THRESHOLD = 8;

/**
 * Outage screen for the clinician app: shared presentational chrome
 * (@workspace/ui) + the app's shared availability state + localized copy.
 * Recovery is automatic (the availability store keeps probing); the button
 * only skips the current backoff delay. Rendered by the app-wide outage gate
 * and the protected workspace shell alike.
 */
export function ServerWarmingScreen() {
  const { reason, attempt, isProbing, retryNow } = useApiAvailability();
  const isOnline = useNetworkStatus();
  const { t } = useTranslation("App");

  // Coming back from an offline device is the one recovery signal the API probe
  // cannot observe, so probe as soon as the browser reports connectivity.
  useEffect(() => {
    if (isOnline) retryNow();
  }, [isOnline, retryNow]);

  const title = !isOnline
    ? t("serverWarming.offlineTitle")
    : reason === "database"
      ? t("serverWarming.databaseTitle")
      : t("serverWarming.apiTitle");

  const description = !isOnline
    ? t("serverWarming.offlineDescription")
    : reason === "database"
      ? t("serverWarming.databaseDescription")
      : t("serverWarming.apiDescription");

  return (
    <SharedServerWarmingScreen
      title={title}
      description={description}
      retryLabel={t("serverWarming.retry")}
      checkingLabel={t("serverWarming.checking")}
      slowHint={
        isOnline && attempt >= SLOW_START_ATTEMPT_THRESHOLD
          ? t("serverWarming.slowHint")
          : null
      }
      isProbing={isProbing}
      isOnline={isOnline}
      onRetry={retryNow}
    />
  );
}
