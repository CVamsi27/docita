"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { NotFoundContent } from "@workspace/ui/components/feedback/not-found-content";

export default function NotFound() {
  return (
    <NotFoundContent>
      <Button asChild>
        <Link href="/today">
          <Home className="mr-2 h-4 w-4" />
          Go to workspace
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/login">Go back</Link>
      </Button>
    </NotFoundContent>
  );
}
