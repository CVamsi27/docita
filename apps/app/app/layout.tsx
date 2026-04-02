import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { LoginLayout, Providers, ToasterWrapper } from "@/features/_shared/components";
import { ReactQueryProvider } from "@/providers/react-query-provider";
import { SentryInitializer } from "@/components/common/monitoring/sentry-initializer";
import { ClientErrorReporter } from "@/components/common/monitoring/client-error-reporter";
import { DOCITA_ICON_CACHE_BUST } from "@workspace/ui/lib/docita-brand";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Docita - Clinic OS",
  description: "The operating system for modern clinics",
  icons: {
    icon: `/icon?${DOCITA_ICON_CACHE_BUST}`,
    shortcut: `/icon?${DOCITA_ICON_CACHE_BUST}`,
    apple: `/apple-icon?${DOCITA_ICON_CACHE_BUST}`,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <body className="app-shell-bg font-sans bg-background text-foreground antialiased overflow-x-hidden">
        <SentryInitializer />
        <ClientErrorReporter />
        <AuthProvider>
          <Providers>
            <ReactQueryProvider>
              <LoginLayout>{children}</LoginLayout>
              <ToasterWrapper />
            </ReactQueryProvider>
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
