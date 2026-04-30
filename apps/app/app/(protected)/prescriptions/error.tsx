"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { Card, CardContent } from "@workspace/ui/components/card";

export default function PrescriptionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {}, [error]);

  return (
    <AppPageScaffold>
      <Card className="mx-auto max-w-md border-destructive/30">
        <CardContent className="flex flex-col items-center pt-8 pb-8 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" aria-hidden />
          </div>
          <h2 className="ui-section-title mb-2 text-[var(--fs-xl)]">
            Error loading Prescriptions
          </h2>
          <p className="ui-page-subtitle mb-6">
            We could not load Prescriptions. Please retry or return to the
            dashboard.
          </p>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => reset()}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
              Try again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" aria-hidden />
                Go to dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppPageScaffold>
  );
}
