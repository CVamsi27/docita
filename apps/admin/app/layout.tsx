import "@workspace/ui/globals.css";
import { Providers } from "./providers";
import { SentryInitializer } from "@/components/sentry-initializer";

export const metadata = {
  title: "Docita Admin - Super Admin Console",
  description: "Manage clinics, users, and system settings",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="font-sans bg-background text-foreground antialiased"
      >
        <SentryInitializer />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
