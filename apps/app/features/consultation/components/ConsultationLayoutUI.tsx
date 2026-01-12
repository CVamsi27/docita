
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
      {/* Sidebar - Desktop only */}
      <aside
        className={cn(
          "hidden md:block border-r overflow-y-auto shrink-0 transition-all duration-300 ease-in-out",
          isSidebarOpen ? "w-80 opacity-100" : "w-0 opacity-0 border-none",
        )}
      >
        {Sidebar}
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden overflow-x-hidden flex flex-col relative h-full">
        {/* Focus Mode Toggle (Floating if sidebar is closed) */}
        {!isSidebarOpen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="absolute left-4 top-4 z-20 h-8 w-8 p-0 rounded-full border shadow-sm bg-background hidden md:flex items-center justify-center hover:bg-accent"
            title="Show Sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        )}
        
        {MainContent}
      </div>
    </div>
  );
}
