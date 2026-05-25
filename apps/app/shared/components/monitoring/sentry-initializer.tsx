"use client";

import { useEffect } from "react";
import { initializeSentryClient } from "@/lib/monitoring/sentry.client.config";

export function SentryInitializer() {
  useEffect(() => {
    initializeSentryClient();
  }, []);

  return null;
}
