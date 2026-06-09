"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { useAuth } from "@/lib/auth/auth";

/**
 * Client gate for `app/(protected)` routes. Redirects unauthenticated or
 * non-INTERNAL users to the internal login surface after auth bootstrap completes.
 */
export function InternalProtectedGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isLoading, isAuthenticated, isInternal } = useAuth();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isInternal)) {
      router.replace("/");
    }
  }, [isAuthenticated, isInternal, isLoading, router]);

  if (isLoading) {
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-3"
        role="status"
        aria-label="Loading workspace"
      >
        <DocitaLoadingIndicator variant="section" withStatusRole={false} />
        <p className="text-sm text-muted-foreground">Loading workspace…</p>
      </div>
    );
  }

  if (!isAuthenticated || !isInternal) return null;

  return children;
}
