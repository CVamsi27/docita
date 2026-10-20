import { Button } from "../form/button";
import { PageTransitionLoader } from "./page-transition-loader";

interface ServerWarmingScreenProps {
  title: string;
  description: string;
  /** Retry label; apps localize it (i18n) or inline it (English-only tools). */
  retryLabel: string;
  /** Label shown while a readiness probe is in flight. */
  checkingLabel: string;
  /** Hint shown after repeated failed probes; omitted when null. */
  slowHint: string | null;
  isProbing: boolean;
  isOnline: boolean;
  onRetry: () => void;
}

/**
 * Presentational outage screen: shown while the platform API or its database
 * is unreachable. State and copy come from the caller — the availability hook
 * lives in @workspace/data-access and the strings belong to each app (i18n in
 * the clinician app, literals in the English-only internal console).
 */
export function ServerWarmingScreen({
  title,
  description,
  retryLabel,
  checkingLabel,
  slowHint,
  isProbing,
  isOnline,
  onRetry,
}: ServerWarmingScreenProps) {
  return (
    <PageTransitionLoader title={title} description={description}>
      <div className="flex flex-col items-center gap-3">
        <Button
          variant="secondary"
          onClick={onRetry}
          disabled={isProbing || !isOnline}
        >
          {isProbing ? checkingLabel : retryLabel}
        </Button>
        {slowHint ? (
          <p className="max-w-xs text-xs text-muted-foreground">{slowHint}</p>
        ) : null}
      </div>
    </PageTransitionLoader>
  );
}
