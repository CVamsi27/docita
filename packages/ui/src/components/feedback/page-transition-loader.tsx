import type { ReactNode } from "react";
import { DocitaLoadingIndicator } from "./docita-loading-indicator";
import { Card, CardContent } from "../indicators/card";

interface PageTransitionLoaderProps {
  title: string;
  description?: string;
  fullscreen?: boolean;
  /** Optional action area (e.g. a retry button) rendered below the status text. */
  children?: ReactNode;
}

/**
 * Centered card loader used for route transitions, redirects, and the
 * server-warming outage screen. Shared by the clinician app and the internal
 * console so both render identical loading chrome.
 */
export function PageTransitionLoader({
  title,
  description,
  fullscreen = true,
  children,
}: PageTransitionLoaderProps) {
  return (
    <div
      className={
        fullscreen
          ? "flex min-h-screen items-center justify-center bg-background px-4"
          : "mx-auto flex min-h-[50vh] w-full max-w-2xl items-center justify-center px-4 py-8"
      }
    >
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <div
            className="flex flex-col items-center gap-4"
            role="status"
            aria-live="polite"
            aria-label={title}
          >
            <DocitaLoadingIndicator variant="page" withStatusRole={false} />
            <div>
              <p className="text-sm font-medium text-foreground">{title}</p>
              {description ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {children ? <div className="w-full">{children}</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
