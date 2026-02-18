"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

export default function ImportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Import route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Error loading Import</h2>
        <p className="mb-6 text-muted-foreground">
          We couldn&apos;t load Import. Please retry or return to the dashboard.
        </p>
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
      </div>
    </div>
  );
}
