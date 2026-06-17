"use client";

import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
// jscpd:ignore-start
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
// jscpd:ignore-end

export default function NotFound() {
  return (
    <AppPageScaffold className="max-w-md">
      <Card className="ui-card-surface">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <FileQuestion
              className="h-7 w-7 text-muted-foreground"
              aria-hidden
            />
          </div>
{/* jscpd:ignore-end */}
          <h1 className="ui-page-title">404</h1>
          <h2 className="ui-section-title mt-2 text-[var(--fs-lg)]">
            Page not found
          </h2>
          <p className="ui-page-subtitle mt-2">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. The
            page may have been moved or deleted.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" aria-hidden />
                Go to dashboard
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Go back</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppPageScaffold>
  );
}
