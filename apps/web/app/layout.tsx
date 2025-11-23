import { Outfit } from "next/font/google"
import "@workspace/ui/globals.css"
import { AuthProvider } from "@/lib/auth-context"
import { Providers } from "@/components/providers"
import { Toaster } from "sonner"

const outfit = Outfit({ subsets: ["latin"] })

export const metadata = {
  title: "Docita - Clinic OS",
  description: "The operating system for modern clinics",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.className} bg-background text-foreground antialiased`}>
        <Providers>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}
