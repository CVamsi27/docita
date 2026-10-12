import { useEffect } from "react";
import { ServerWarmingScreen as SharedServerWarmingScreen } from "@workspace/ui/components/feedback/server-warming-screen";
import { useNetworkStatus } from "@workspace/data-access";
import { useApiAvailability } from "@/lib/api/api-availability";

/** After roughly a minute of failed probes the copy stops promising "a few seconds". */
const SLOW_START_ATTEMPT_THRESHOLD = 8;

/**
 * Outage screen for the internal console: shared presentational chrome
 * (@workspace/ui) + the console's shared availability state + English copy
 * (the internal console is an ops tool with no i18n layer; see
 * UI_UX_STANDARD_2026 §2.2). Recovery is automatic; the button only skips the
 * current backoff delay. Rendered by the app-wide outage gate.
 */
export function ServerWarmingScreen() {
  const { reason, attempt, isProbing, retryNow } = useApiAvailability();
  const isOnline = useNetworkStatus();

  // Coming back from an offline device is the one recovery signal the API probe
  // cannot observe, so probe as soon as the browser reports connectivity.
  useEffect(() => {
    if (isOnline) retryNow();
  }, [isOnline, retryNow]);

  const title = !isOnline
    ? "You're offline"
    : reason === "database"
      ? "Getting things ready…"
      : "Server is warming up…";

  const description = !isOnline
    ? "Check your internet connection. We'll reconnect automatically once you're back online."
    : reason === "database"
      ? "The service is starting its database. This usually takes a few seconds — you'll be connected automatically."
      : "The backend is starting from cold. This takes a few seconds — you'll be connected automatically.";

  return (
    <SharedServerWarmingScreen
      title={title}
      description={description}
      retryLabel="Try again"
      checkingLabel="Checking…"
      slowHint={
        isOnline && attempt >= SLOW_START_ATTEMPT_THRESHOLD
          ? "This is taking longer than usual. Try again, or check your connection."
          : null
      }
      isProbing={isProbing}
      isOnline={isOnline}
      onRetry={retryNow}
    />
  );
}
