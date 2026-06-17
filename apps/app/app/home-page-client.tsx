"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { getPostAuthPath } from "@/features/auth/lib/auth-landing-path";
import { PageTransitionLoader } from "@/components/loaders/page-transition-loader";

/**
 * Neutral entry point. Instead of hard-redirecting to /today (which then bounces
 * unauthenticated/onboarding users and can flash on a cold API), we resolve the
 * destination here behind a calm splash. The auth bootstrap surfaces a cold-start
 * state so the first visitor sees a clear "waking up" message rather than errors.
 */
export function HomePageClient() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isApiStarting } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user) {
      router.replace(getPostAuthPath(user));
      return;
    }
    router.replace("/login");
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <PageTransitionLoader
      title={isApiStarting ? "Waking up your workspace…" : "Loading Docita…"}
      description={
        isApiStarting
          ? "This can take a few seconds on first load — hang tight."
          : "Getting things ready for you."
      }
    />
  );
}
