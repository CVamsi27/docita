"use client";
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
    <NotFoundContent>
      <Link href="/today" style={notFoundPrimaryStyle}>
        Go to workspace
      </Link>
      <Link href="/login" style={notFoundSecondaryStyle}>
        Go back
      </Link>
    </NotFoundContent>
  );
}
