"use client";

import { useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirectedRef = useRef(false);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle redirect synchronously during render
  if (!isAuthenticated && !hasRedirectedRef.current) {
    hasRedirectedRef.current = true;
    // Store the attempted URL to redirect back after login
    if (typeof window !== "undefined") {
      sessionStorage.setItem("redirectAfterLogin", pathname);
      // Use setTimeout to avoid updating state during render - only on client
      setTimeout(() => router.push("/login"), 0);
    }
    return null;
  }

  // Don't render children if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
