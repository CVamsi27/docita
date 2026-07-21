import { cn } from "@workspace/ui/lib/utils";
import {
  Button,
  SymbolTooltip
} from "@workspace/ui/components";
import { PanelLeft } from "lucide-react";

interface ConsultationLayoutUIProps {
  Sidebar: React.ReactNode;
  MainContent: React.ReactNode;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function ConsultationLayoutUI({
  Sidebar,
  MainContent,
  isSidebarOpen,
  onToggleSidebar,
}: ConsultationLayoutUIProps) {
  return (
    <div className="flex-1 overflow-hidden">
      <div className="flex h-full overflow-x-hidden bg-background">
        <aside
          className={cn(
            "hidden md:block border-r border-border/60 overflow-y-auto shrink-0 bg-background/80",
            isSidebarOpen ? "w-72 lg:w-80" : "w-0 overflow-hidden border-none",
          )}
        >
          {Sidebar}
        </aside>

        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative">
          {!isSidebarOpen && (
            <SymbolTooltip label="Show patient sidebar">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className={cn(
                  "absolute left-4 top-4 z-20 hidden size-8 items-center justify-center rounded-full border bg-background p-0 shadow-sm md:flex",
                  "cursor-pointer hover:bg-accent",
                )}
                aria-label="Show patient sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </SymbolTooltip>
          )}

          <div className="p-3 md:p-4">
            {MainContent}
          </div>
        </div>
      </div>
    </div>
  );
}
