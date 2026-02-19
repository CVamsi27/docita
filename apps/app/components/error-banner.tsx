/**
 * Reusable error banner component for displaying general form errors
 * Used when error is not tied to a specific field
 */

import React from "react";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

interface ErrorBannerProps {
  message?: string;
  onDismiss?: () => void;
  title?: string;
  details?: string[];
}

/**
 * ErrorBanner displays a prominent error message at the top of a form
 * Features:
 * - Clear error message
 * - Optional dismiss button
 * - Support for multiple error details
 * - Accessible with proper ARIA labels
 */
export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onDismiss,
  title,
  details,
}) => {
  if (!message && !title) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-destructive animate-in fade-in slide-in-from-top-1"
    >
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1">
          {title && <p className="font-medium text-sm mb-1">{title}</p>}
          {message && <p className="text-sm">{message}</p>}
          {details && details.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {details.map((detail, index) => (
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
