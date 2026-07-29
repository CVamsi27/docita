import "./globals.css";
import { headers } from "next/headers";
import { getMessages } from "next-intl/server";
import dynamic from "next/dynamic";
import { esbuildHelperBootstrapScript } from "@workspace/utils/runtime/esbuild-helper-bootstrap";

const ClientLayout = dynamic(() => import("./client-layout"), { ssr: true });

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // Phase 6.1 scaffold: load the default-locale message bundle and feed it
  // into the client provider. With localePrefix: "never" and a single
  // locale, this is effectively a no-op today — but every t() call site
  // can now resolve against a real provider instead of throwing.
  const messages = await getMessages();

  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <head>
        <link rel="preconnect" href="https://api.docita.work" crossOrigin="anonymous" />
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: esbuildHelperBootstrapScript }}
        />
      </head>
      <body className="app-shell-bg font-sans bg-background text-foreground antialiased overflow-x-hidden">
        <ClientLayout nonce={nonce} messages={messages}>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
