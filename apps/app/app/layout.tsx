import "./globals.css";
import "leaflet/dist/leaflet.css";
import { headers } from "next/headers";
import { AuthProvider } from "@/lib/auth-context";
import { Providers, ToasterWrapper } from "@/features/_shared/components";
import { ReactQueryProvider } from "@/providers/react-query-provider";
import { SentryInitializer } from "@/components/common/monitoring/sentry-initializer";
import { ClientErrorReporter } from "@/components/common/monitoring/client-error-reporter";
import { WebVitalsReporter } from "@/features/_shared/components/layout/web-vitals-reporter";

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

const esbuildHelperBootstrapScript = `
if (typeof globalThis.__name !== "function") {
  globalThis.__name = function(target) {
    return target;
  };
}
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <head>
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
            <Providers nonce={nonce}>
              {children}
              <ToasterWrapper />
            </Providers>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
