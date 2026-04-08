import "./globals.css";
import { OptionalSentryInitializer } from "@/components/optional-sentry-initializer";
import { Providers } from "./providers";

export const metadata = {
  title: "Docita Internal - Internal Console",
  description: "Manage clinics, users, and system settings",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/branding/Round_Logo-512.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="app-shell-bg font-sans bg-background text-foreground antialiased">
        <OptionalSentryInitializer
          enabled={process.env.DOCITA_CLOUDFLARE !== "1"}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
