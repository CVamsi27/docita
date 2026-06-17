"use client";

export const dynamic = "force-dynamic";
// jscpd:ignore-start
import Link from "next/link";
import {
  NotFoundContent,
  notFoundPrimaryStyle,
  notFoundSecondaryStyle,
} from "@workspace/ui/components/feedback/not-found-content";
// jscpd:ignore-end

export default function NotFound() {
  return (
    <NotFoundContent
      subtitle="Page not found"
      description="Sorry, we couldn't find the page you're looking for. The page may have been moved or deleted."
    >
      <Link href="/today" style={notFoundPrimaryStyle}>
        Go to dashboard
      </Link>
      <Link href="/today" style={notFoundSecondaryStyle}>
        Go back
      </Link>
    </NotFoundContent>
  );
}
