"use client";

import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ReactQueryProvider } from "@/providers/react-query-provider";
import { DataAccessBridge } from "@/providers/data-access-bridge";
import { SentryInitializer } from "@/components/monitoring/sentry-initializer";
import { ClientErrorReporter } from "@/components/monitoring/client-error-reporter";
import { WebVitalsReporter } from "@/components/layout/web-vitals-reporter";
import { ApiAvailabilityOverlay } from "@/components/feedback/api-availability-overlay";
import { Providers } from "@/components/layout/providers";
import { ToasterWrapper } from "@/components/layout/toaster-wrapper";

export default function ClientLayout({
  children,
  nonce,
  messages,
}: {
  children: ReactNode;
  nonce?: string;
  messages: Record<string, unknown>;
}) {
  return (
    <>
      <SentryInitializer />
      <ClientErrorReporter />
      <WebVitalsReporter />
      <NextIntlClientProvider locale="en" messages={messages}>
        <ReactQueryProvider>
          <AuthProvider>
            <DataAccessBridge>
              <Providers nonce={nonce}>
                {children}
                <ApiAvailabilityOverlay />
                <ToasterWrapper />
              </Providers>
            </DataAccessBridge>
          </AuthProvider>
        </ReactQueryProvider>
      </NextIntlClientProvider>
    </>
  );
}
