"use client";

import { useEffect } from "react";
import { initializeSentryClient } from "@/lib/sentry.client.config";

export function SentryInitializer() {
  useEffect(() => {
    initializeSentryClient();
  }, []);

  return null;
}
