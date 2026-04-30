"use client";

import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { FileQuestion, Home } from "lucide-react";
import { BackButton } from "@/components/common/navigation/back-button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="mb-2 text-4xl font-bold tracking-normal">404</h1>
        <h2 className="mb-2 text-xl font-semibold">Page not found</h2>
        <p className="mb-6 text-muted-foreground">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. The
          page may have been moved or deleted.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Go to dashboard
            </Link>
          </Button>
          <BackButton
            fallback="/dashboard"
            label="Go back"
            variant="outline"
            size="default"
          />
        </div>
      </div>
    </div>
  );
}
