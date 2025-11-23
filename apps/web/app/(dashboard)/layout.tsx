import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { ClinicProvider } from "@/lib/clinic-context"
import { AuthGuard } from "@/components/auth/auth-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <ClinicProvider>
        <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950">
          <div className="hidden md:flex">
            <Sidebar />
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            <header className="flex h-14 items-center gap-4 border-b bg-background px-6 md:hidden">
              <MobileNav />
              <span className="font-bold text-lg">Docita</span>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              {children}
            </main>
          </div>
        </div>
      </ClinicProvider>
    </AuthGuard>
  )
}
