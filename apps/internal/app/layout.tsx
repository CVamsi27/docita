import "./globals.css";
import { OptionalSentryInitializer } from "@/components/optional-sentry-initializer";
import { Providers } from "./providers";

export const metadata = {
  title: "Docita Internal - Internal Console",
  description: "Manage facilities, users, and system settings",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/branding/Round_Logo-512.png",
  },
};

// Static theme bootstrap only — reads localStorage keys defined by the app; no request data.
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body className="app-shell-bg font-sans bg-background text-foreground antialiased">
        <OptionalSentryInitializer
          enabled={process.env.DOCITA_CLOUDFLARE !== "1"}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
