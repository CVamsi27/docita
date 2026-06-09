"use client";

import { useEffect } from "react";
import { Button } from "@workspace/ui/components/form/button";
import { Home, RefreshCw } from "lucide-react";
import { SupportContact } from "@/components/support-contact/support-contact";
import { captureException } from "@/lib/monitoring/sentry.client.config";
import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function Error({
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
    <ErrorPageShell
      title="We could not load this page"
      description="We had trouble loading this page. Please try again."
    >
      <SupportContact
        layout="stack"
        variant="footer"
        className="mb-6 w-full text-left sm:text-center"
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button onClick={() => reset()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
        <Button
          variant="outline"
          onClick={() => (window.location.href = "/dashboard")}
        >
          <Home className="mr-2 h-4 w-4" />
          Go to dashboard
        </Button>
      </div>
    </ErrorPageShell>
  );
}
