import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
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
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="absolute left-4 top-4 z-20 h-8 w-8 p-0 rounded-full border shadow-sm bg-background hidden md:flex items-center justify-center hover:bg-accent cursor-pointer"
              title="Show Patient Sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}

          <div className="p-4 md:p-6">
            {MainContent}
          </div>
        </div>
      </div>
    </div>
  );
}
