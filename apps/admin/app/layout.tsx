import { Outfit } from "next/font/google"
import "@workspace/ui/globals.css"
import { Toaster } from "sonner"

const outfit = Outfit({ subsets: ["latin"] })

export const metadata = {
  title: "Docita Admin - Super Admin Console",
  description: "Manage clinics, users, and system settings",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.className} bg-background text-foreground antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
