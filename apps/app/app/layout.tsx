import "./globals.css";
import { headers } from "next/headers";
import { AuthProvider } from "@/lib/auth/auth-context";
import { Providers, ToasterWrapper } from "@/components";
import { ReactQueryProvider } from "@/providers/react-query-provider";
import { DataAccessBridge } from "@/providers/data-access-bridge";
import { SentryInitializer } from "@/components/monitoring/sentry-initializer";
import { ClientErrorReporter } from "@/components/monitoring/client-error-reporter";
import { WebVitalsReporter } from "@/components/layout/web-vitals-reporter";
import { ApiAvailabilityOverlay } from "@/components/feedback/api-availability-overlay";
import { esbuildHelperBootstrapScript } from "@workspace/utils/runtime/esbuild-helper-bootstrap";

export const metadata = {
  title: "Docita - Healthcare OS",
  description: "The operating system for modern healthcare facilities",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/branding/Round_Logo-512.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <head>
        <link rel="preconnect" href="https://api.docita.work" crossOrigin="anonymous" />
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: esbuildHelperBootstrapScript }}
        />
      </head>
      <body className="app-shell-bg font-sans bg-background text-foreground antialiased overflow-x-hidden">
        <SentryInitializer />
        <ClientErrorReporter />
        <WebVitalsReporter />
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
      </body>
    </html>
  );
}
