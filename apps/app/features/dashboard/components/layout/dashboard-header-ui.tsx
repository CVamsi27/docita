import { Check, Copy, Search, Share2, Stethoscope } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { format } from "date-fns";
import { useState } from "react";
import { useFacilityLabel } from "@/lib/facility-label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

export interface DashboardHeaderUIProps {
  userName: string;
  greeting: string;
  onSearchClick: () => void;
  clinicCode?: string | null;
  clinicName?: string;
  canQuickShareClinicCode?: boolean;
}

export function DashboardHeaderUI({
  userName,
  greeting,
  onSearchClick,
  clinicCode,
  clinicName,
  canQuickShareClinicCode = false,
}: DashboardHeaderUIProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const facilityLabel = useFacilityLabel();

  const handleCopyCode = async () => {
    if (!clinicCode) return;
    await navigator.clipboard.writeText(clinicCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickShare = async () => {
    if (!clinicCode) return;

    const shareText = `Join ${clinicName || `our ${facilityLabel.toLowerCase()}`} on Docita using ${facilityLabel.toLowerCase()} code: ${clinicCode}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${facilityLabel} Join Code`,
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      try {
        await navigator.clipboard.writeText(shareText);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
      }
    }
  };

  return (
    <TooltipProvider>
      <header className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm sm:h-12 sm:w-12">
            <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>
        <div>
          <p className="ui-helper-text">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
          <h1 className="ui-section-title text-[var(--fs-2xl)] md:text-[var(--fs-3xl)]">
            {greeting}, {userName}!
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {canQuickShareClinicCode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={handleQuickShare}
                disabled={!clinicCode}
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 px-3 text-xs text-muted-foreground hover:text-foreground touch-manipulation"
              >
                {shared ? (
                  <Check className="h-3.5 w-3.5 text-success shrink-0" />
                ) : (
                  <Share2 className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>{shared ? "Shared" : "Quick Share"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Quick Share
            </TooltipContent>
          </Tooltip>
        )}
        {clinicCode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={handleCopyCode}
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 px-3 text-xs text-muted-foreground hover:text-foreground touch-manipulation"
              >
                <span className="font-mono font-medium tracking-wider">
                  {clinicCode}
                </span>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success shrink-0" />
                ) : (
                  <Copy className="h-3.5 w-3.5 shrink-0" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Copy code
            </TooltipContent>
          </Tooltip>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-10 sm:h-9 w-full md:hidden justify-start text-muted-foreground bg-background touch-manipulation"
          onClick={onSearchClick}
        >
          <Search className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Search patients...</span>
          <span className="sm:hidden">Search...</span>
          <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium sm:flex">
            ⌘K
          </kbd>
        </Button>
      </div>
      </header>
    </TooltipProvider>
  );
}
