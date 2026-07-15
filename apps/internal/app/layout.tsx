import "./globals.css";
import { headers } from "next/headers";
import { OptionalSentryInitializer } from "@/components/optional-sentry-initializer";
import { Providers } from "./providers";
import { esbuildHelperBootstrapScript } from "@workspace/utils/runtime/esbuild-helper-bootstrap";

export const metadata = {
  title: "Docita Internal - Internal Console",
  description: "Manage facilities, users, and system settings",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/branding/Round_Logo-512.png",
  },
};

const themeBootstrapScript = `
try {
  var theme = localStorage.getItem("theme");
  if (theme !== "dark" && theme !== "light") theme = "light";
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
  document.documentElement.style.colorScheme = theme;
} catch {
  document.documentElement.classList.add("light");
  document.documentElement.style.colorScheme = "light";
}
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://api.docita.work"
          crossOrigin="anonymous"
        />
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: esbuildHelperBootstrapScript }}
        />
        <script
          suppressHydrationWarning
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body className="app-shell-bg font-sans bg-background text-foreground antialiased">
        <OptionalSentryInitializer
          enabled={process.env.DOCITA_CLOUDFLARE !== "1"}
        />
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
