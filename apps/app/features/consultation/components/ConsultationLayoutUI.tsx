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
    <div className="flex-1 overflow-hidden flex overflow-x-hidden relative">
      {}
      <aside
        className={cn(
          "hidden md:block border-r overflow-y-auto shrink-0 transition-[width,opacity] duration-150 ease-out",
          isSidebarOpen ? "w-80 opacity-100" : "w-0 opacity-0 border-none",
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
            className="absolute left-4 top-4 z-20 h-8 w-8 p-0 rounded-full border shadow-sm bg-background hidden md:flex items-center justify-center hover:bg-accent"
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
  );
}
