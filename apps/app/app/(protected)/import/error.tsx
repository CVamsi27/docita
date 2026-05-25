"use client";

import Link from "next/link";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";

export default function ImportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error;

  return (
    <AppPageScaffold className="max-w-md">
      <Card className="ui-card-surface">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="ui-section-title">We could not load this import</h2>
          <p className="ui-page-subtitle mt-2">
            Please try again, or return to the dashboard.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={reset}>
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
        </CardContent>
      </Card>
    </AppPageScaffold>
  );
}
