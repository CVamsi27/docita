"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { BackButton } from "@/components/common/back-button";
import { NotFoundContent } from "@workspace/ui/components/feedback/not-found-content";

export default function NotFound() {
  return (
    <NotFoundContent description="Sorry, we couldn't find the page you're looking for. The page may have been moved or deleted.">
      <Button asChild>
        <Link href="/">
          <Home className="mr-2 h-4 w-4" />
          Go to dashboard
        </Link>
      </Button>
      <BackButton fallback="/" label="Go back" variant="outline" size="default" />
    </NotFoundContent>
  );
}
