import { Outfit } from "next/font/google";
import "@workspace/ui/globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Providers } from "@/components/providers";
import { ReactQueryProvider } from "@/providers/react-query-provider";
import { ToasterWrapper } from "@/components/toaster-wrapper";
import { LoginLayout } from "@/components/layout/login-layout";

// Disable static generation for this route
export const dynamic = "force-dynamic";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata = {
  title: "Docita - Clinic OS",
  description: "The operating system for modern clinics",
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
      <body
        className={`${outfit.className} bg-background text-foreground antialiased overflow-x-hidden`}
      >
        <Providers>
          <ReactQueryProvider>
            <AuthProvider>
              <LoginLayout>{children}</LoginLayout>
              <ToasterWrapper />
            </AuthProvider>
          </ReactQueryProvider>
        </Providers>
      </body>
    </html>
  );
}
