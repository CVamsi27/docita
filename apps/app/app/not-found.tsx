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
            <FileQuestion className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="ui-page-title">404</h1>
          <p className="ui-page-subtitle mt-2">
            Sorry, we couldn&apos;t find the page you&apos;re looking for.
          </p>
{/* jscpd:ignore-end */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href="/today">
                <Home className="mr-2 h-4 w-4" />
                Go to workspace
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Go back</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppPageScaffold>
  );
}
