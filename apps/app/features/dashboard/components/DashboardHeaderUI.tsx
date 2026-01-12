import { Search, Stethoscope } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { format } from "date-fns";

export interface DashboardHeaderUIProps {
  userName: string;
  greeting: string;
  onSearchClick: () => void;
}

export function DashboardHeaderUI({
  userName,
  greeting,
  onSearchClick,
}: DashboardHeaderUIProps) {
  return (
    <header className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-linear-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/25">
            <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 flex h-3 w-3 sm:h-4 sm:w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 sm:h-4 sm:w-4 bg-green-500 border-2 border-background"></span>
          </span>
        </div>
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">
            {greeting}, {userName}!
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-10 sm:h-9 w-full md:w-56 justify-start text-muted-foreground bg-background/50 backdrop-blur-sm touch-manipulation"
          onClick={onSearchClick}
        >
          <Search className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Search patients...</span>
          <span className="sm:hidden">Search...</span>
          <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
            ⌘K
          </kbd>
        </Button>
      </div>
    </header>
  );
}
