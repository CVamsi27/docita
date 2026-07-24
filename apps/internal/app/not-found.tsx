"use client";
import Link from "next/link";
import { NotFoundContent, notFoundPrimaryStyle, notFoundSecondaryStyle } from "@workspace/ui/components/feedback/not-found-content";

export default function NotFound() {
  return (
    <NotFoundContent description="Sorry, we couldn't find the page you're looking for. The page may have been moved or deleted.">
      <Link href="/" style={notFoundPrimaryStyle}>
        Go to dashboard
      </Link>
      <Link href="/" style={notFoundSecondaryStyle}>
        Go back
      </Link>
    </NotFoundContent>
  );
}
