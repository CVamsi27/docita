"use client";

import { AppShell } from "@workspace/ui/components/layout/app-shell";
import { InternalProtectedGate } from "@/lib/auth/internal-protected-gate";
import { MobileNav } from "./dashboard/mobile-nav";
import { InternalSidebar } from "@/components/internal-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <InternalProtectedGate>
    <AppShell
      className="h-[100dvh] overflow-hidden"
      sidebar={<InternalSidebar />}
      topBar={
        <div className="flex h-14 items-center gap-4 px-4 md:hidden">
          <MobileNav />
          <span className="flex-1 text-lg font-semibold tracking-tight">
            Docita Internal
          </span>
          <ThemeToggle />
        </div>
      }
      mainClassName="overflow-y-auto"
    >
      {children}
    </AppShell>
    </InternalProtectedGate>
  );
}
