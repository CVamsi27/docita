import "./globals.css";
import Script from "next/script";
import { AuthProvider } from "@/lib/auth-context";
import { LoginLayout, Providers, ToasterWrapper } from "@/features/_shared/components";
import { ReactQueryProvider } from "@/providers/react-query-provider";
import { SentryInitializer } from "@/components/common/monitoring/sentry-initializer";
import { ClientErrorReporter } from "@/components/common/monitoring/client-error-reporter";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Docita - Clinic OS",
  description: "The operating system for modern clinics",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <body className="app-shell-bg font-sans bg-background text-foreground antialiased overflow-x-hidden">
        {/* esbuild's __name helper may appear in server-rendered inline scripts
            (e.g. next-themes ThemeProvider) when the Cloudflare edge worker
            bundles server code with keepNames. Define a browser-safe polyfill
            before any other scripts execute. */}
        <Script id="esbuild-name-polyfill" strategy="beforeInteractive">{`var __defProp=Object.defineProperty;var __name=function(t,n){if(t.name!==n)try{__defProp(t,"name",{value:n,configurable:true})}catch(e){}return t};`}</Script>
        <SentryInitializer />
        <ClientErrorReporter />
        <ReactQueryProvider>
          <AuthProvider>
            <Providers>
              <LoginLayout>{children}</LoginLayout>
              <ToasterWrapper />
            </Providers>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
