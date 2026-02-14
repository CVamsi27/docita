"use client";

import { useEffect } from "react";
import { initializeSentryClient } from "@/lib/sentry.client.config";

/**
 * Client component that initializes Sentry error tracking on app load
 * Must be rendered in a client component
 */
export function SentryInitializer() {
  useEffect(() => {
    initializeSentryClient();
  }, []);

  return null;
}
