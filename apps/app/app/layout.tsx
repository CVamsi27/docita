import "@workspace/ui/globals.css";
import "leaflet/dist/leaflet.css";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { Providers, ToasterWrapper } from "@/features/_shared/components";
import { ReactQueryProvider } from "@/providers/react-query-provider";
import { SentryInitializer } from "@/components/common/monitoring/sentry-initializer";
import { ClientErrorReporter } from "@/components/common/monitoring/client-error-reporter";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`overflow-x-hidden ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="app-shell-bg font-sans bg-background text-foreground antialiased overflow-x-hidden">
        <SentryInitializer />
        <ClientErrorReporter />
        <ReactQueryProvider>
          <AuthProvider>
            <Providers>
              {children}
              <ToasterWrapper />
            </Providers>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
