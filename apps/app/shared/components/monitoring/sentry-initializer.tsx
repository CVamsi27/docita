"use client";

import { createMountInitializer } from "@workspace/hooks";
import { initializeSentryClient } from "@/lib/monitoring/sentry.client.config";

export const SentryInitializer = createMountInitializer(initializeSentryClient);
