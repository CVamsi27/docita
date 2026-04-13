

import React from "react";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { getSafeUserMessage } from "@/lib/user-facing-errors";

interface ErrorBannerProps {
  message?: string;
  onDismiss?: () => void;
  title?: string;
  details?: string[];
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onDismiss,
  title,
  details,
}) => {
  if (!message && !title) return null;

  const safeMessage = message
    ? getSafeUserMessage(
        message,
        "Please review the information on this screen and try again.",
      )
    : undefined;
  const safeDetails = details?.map((detail) =>
    getSafeUserMessage(detail, "Please check this item."),
  );

  return (
    <div
      role="alert"
      aria-live="polite"
      className="surface-danger rounded-lg p-4 animate-in fade-in slide-in-from-top-1"
    >
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1">
          {title && <p className="font-medium text-sm mb-1">{title}</p>}
          {safeMessage && <p className="text-sm">{safeMessage}</p>}
          {safeDetails && safeDetails.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {safeDetails.map((detail, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="inline-block w-1 h-1 bg-current rounded-full" />
                  {detail}
                </li>
              ))}
            </ul>
          )}
        </div>
        {onDismiss && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 -mt-1"
            onClick={onDismiss}
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
