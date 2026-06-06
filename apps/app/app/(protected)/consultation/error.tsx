"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Home, RefreshCw } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { captureException } from "@/lib/monitoring/sentry.client.config";
import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function ConsultationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, { digest: error.digest, scope: "consultation" });
  }, [error]);

  return (
    <ErrorPageShell
      title="Error loading consultation"
      description="We couldn't load the consultation workspace. Please retry."
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button onClick={() => reset()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <Home className="mr-2 h-4 w-4" />
            Go to dashboard
          </Link>
        </Button>
      </div>
    </ErrorPageShell>
  );
}
