import { Check, Copy, Search, Stethoscope } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { format } from "date-fns";
import { useState } from "react";

export interface DashboardHeaderUIProps {
  userName: string;
  greeting: string;
  onSearchClick: () => void;
  clinicCode?: string | null;
}

export function DashboardHeaderUI({
  userName,
  greeting,
  onSearchClick,
  clinicCode,
}: DashboardHeaderUIProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!clinicCode) return;
    await navigator.clipboard.writeText(clinicCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-linear-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/25">
            <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
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
        {clinicCode && (
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 h-9 px-3 rounded-md border bg-background/50 backdrop-blur-sm text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors touch-manipulation"
            title="Copy clinic code to share with staff"
          >
            <span className="font-mono font-medium tracking-wider">
              {clinicCode}
            </span>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success shrink-0" />
            ) : (
              <Copy className="h-3.5 w-3.5 shrink-0" />
            )}
          </button>
        )}
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
