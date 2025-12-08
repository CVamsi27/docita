"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { FloatingStartConsultation } from "@/components/layout/floating-start-consultation";
import { CommandPalette } from "@/components/common/command-palette";
import { ClinicProvider } from "@/lib/clinic-context";
import { NavigationHistoryProvider } from "@/providers/navigation-history-provider";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <NavigationHistoryProvider>
      <ClinicProvider>
        <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel
              defaultSize={18}
              minSize={15}
              maxSize={25}
              className="hidden md:block"
              collapsible={true}
              collapsedSize={4}
              onCollapse={() => setIsCollapsed(true)}
              onExpand={() => setIsCollapsed(false)}
            >
              <Sidebar isCollapsed={isCollapsed} />
            </ResizablePanel>
            <ResizableHandle withHandle className="hidden md:flex" />
            <ResizablePanel defaultSize={82}>
              <div className="flex h-full flex-col overflow-hidden">
                <header className="flex h-14 items-center gap-4 border-b bg-background px-6 md:hidden">
                  <MobileNav />
                  <span className="font-bold text-lg">Docita</span>
                </header>
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                  {children}
                </main>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        <FloatingStartConsultation />
        <CommandPalette />
      </ClinicProvider>
    </NavigationHistoryProvider>
  );
}
