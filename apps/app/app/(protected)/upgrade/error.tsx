"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Home, RefreshCw } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { logger } from "@/lib/monitoring/logger";
import { ErrorPageShell } from "@/components/errors/error-page-shell";

export default function UpgradeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Upgrade page error", { error });
  }, [error]);

  return (
    <ErrorPageShell
      title="Error loading Upgrade"
      description="We couldn't load the upgrade page. Please retry or return to the dashboard."
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
