"use client";

import { DocitaIcon } from "@workspace/ui/components/docita-logo";
import { Card, CardContent } from "@workspace/ui/components/card";

interface PageTransitionLoaderProps {
  title: string;
  description?: string;
  fullscreen?: boolean;
}

export function PageTransitionLoader({
  title,
  description,
  fullscreen = true,
}: PageTransitionLoaderProps) {
  return (
    <div
      className={
        fullscreen
          ? "flex min-h-screen items-center justify-center bg-background px-4"
          : "mx-auto flex min-h-[50vh] w-full max-w-2xl items-center justify-center px-4 py-8"
      }
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="docita-loading-pulse">
            <DocitaIcon className="h-12 w-12" />
          </div>
          <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
            <div className="docita-loading-shimmer h-full w-1/2 rounded-full bg-primary/40" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{title}</p>
            {description ? (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
