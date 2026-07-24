"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { AppPageScaffold, Button, Card, CardContent } from "@workspace/ui/components";

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <AppPageScaffold className="max-w-md">
          <Card className="ui-card-surface">
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-7 w-7 text-destructive" />
              </div>
              <h1 className="ui-section-title">We could not load this page</h1>
              <p className="ui-page-subtitle mt-2">
                Please try again or contact support if the problem persists.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button onClick={reset}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/")}
                >
                  Go to home
                </Button>
              </div>
            </CardContent>
          </Card>
        </AppPageScaffold>
      </body>
    </html>
  );
}
