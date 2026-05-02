import "./globals.css";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { OptionalSentryInitializer } from "@/components/optional-sentry-initializer";
import { Providers } from "./providers";

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

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  title: "Docita Internal - Internal Console",
  description: "Manage facilities, users, and system settings",
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} ${fraunces.variable}`}
    >
      <body className="app-shell-bg font-sans bg-background text-foreground antialiased">
        <OptionalSentryInitializer
          enabled={process.env.DOCITA_CLOUDFLARE !== "1"}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
