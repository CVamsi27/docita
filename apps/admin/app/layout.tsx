import "./globals.css";
import { OptionalSentryInitializer } from "@/components/optional-sentry-initializer";
import { Providers } from "./providers";
import { DOCITA_ICON_CACHE_BUST } from "@workspace/ui/lib/docita-brand";

export const metadata = {
  title: "Docita Admin - Super Admin Console",
  description: "Manage clinics, users, and system settings",
  icons: {
    icon: `/branding/Round_Logo.png?${DOCITA_ICON_CACHE_BUST}`,
    shortcut: `/branding/Round_Logo.png?${DOCITA_ICON_CACHE_BUST}`,
    apple: `/branding/Round_Logo.png?${DOCITA_ICON_CACHE_BUST}`,
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
