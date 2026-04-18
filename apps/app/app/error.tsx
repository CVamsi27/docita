"use client";

import { useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import { captureException } from "@/lib/sentry.client.config";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, { digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="mb-2 text-[var(--fs-xl)] font-semibold">
          We could not load this page
        </h2>
        <p className="mb-6 text-muted-foreground text-[var(--fs-sm)]">
          Please refresh the page or return home to continue.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => reset()}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
            Refresh page
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            <Home className="mr-2 h-4 w-4" aria-hidden />
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
