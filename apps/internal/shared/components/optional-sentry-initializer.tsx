"use client";

import dynamic from "next/dynamic";

const SentryInitializer = dynamic(
  () =>
    import("@/components/sentry-initializer").then(
      (module) => module.SentryInitializer,
    ),
  { ssr: false },
);

export function OptionalSentryInitializer({
  enabled,
}: {
  enabled: boolean;
}) {
  if (!enabled) return null;

  return <SentryInitializer />;
}
