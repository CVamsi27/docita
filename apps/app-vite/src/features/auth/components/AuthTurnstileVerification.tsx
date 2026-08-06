import { TurnstileWidget } from "@workspace/ui/components/form/turnstile-widget";

interface AuthTurnstileVerificationProps {
  siteKey: string;
  turnstileError: string | null;
  onToken: (token: string) => void;
  onExpire: () => void;
}

/**
 * Shared Turnstile challenge block for the login + signup steps (P5.17).
 * Rendered only when `siteKey` is configured; the error surfaces the
 * submit-time gate message ("complete the security verification…").
 */
export function AuthTurnstileVerification({
  siteKey,
  turnstileError,
  onToken,
  onExpire,
}: AuthTurnstileVerificationProps) {
  return (
    <div className="space-y-1.5">
      <TurnstileWidget
        siteKey={siteKey}
        onToken={onToken}
        onExpire={onExpire}
        className="flex w-full justify-center [&_iframe]:max-w-full"
      />
      {turnstileError && (
        <p className="text-xs text-destructive" role="alert">
          {turnstileError}
        </p>
      )}
    </div>
  );
}
