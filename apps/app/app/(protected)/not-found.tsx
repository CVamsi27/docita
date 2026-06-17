"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { NotFoundContent } from "@workspace/ui/components/feedback/not-found-content";

export default function NotFound() {
  return (
    <NotFoundContent
      subtitle="Page not found"
      description="Sorry, we couldn't find the page you're looking for. The page may have been moved or deleted."
    >
      <Button asChild>
        <Link href="/dashboard">
          <Home className="mr-2 h-4 w-4" aria-hidden />
          Go to dashboard
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/dashboard">Go back</Link>
      </Button>
    </NotFoundContent>
  );
}
