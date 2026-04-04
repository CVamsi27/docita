import { Check, Copy, Search, Share2, Stethoscope } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { format } from "date-fns";
import { useState } from "react";

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

  const handleCopyCode = async () => {
    if (!clinicCode) return;
    await navigator.clipboard.writeText(clinicCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickShare = async () => {
    if (!clinicCode) return;

    const shareText = `Join ${clinicName || "our clinic"} on Docita using clinic code: ${clinicCode}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Clinic Join Code",
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
        // no-op
      }
    }
  };

  return (
    <header className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-linear-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground shadow-sm">
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
        {canQuickShareClinicCode && (
          <button
            onClick={handleQuickShare}
            disabled={!clinicCode}
            className="flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 text-xs text-muted-foreground transition-colors duration-150 hover:bg-muted/40 hover:text-foreground touch-manipulation disabled:cursor-not-allowed disabled:opacity-60"
            title={
              clinicCode
                ? "Quick share clinic join code"
                : "Clinic code not available"
            }
          >
            {shared ? (
              <Check className="h-3.5 w-3.5 text-success shrink-0" />
            ) : (
              <Share2 className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{shared ? "Shared" : "Quick Share"}</span>
          </button>
        )}
        {clinicCode && (
          <button
            onClick={handleCopyCode}
            className="flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 text-xs text-muted-foreground transition-colors duration-150 hover:bg-muted/40 hover:text-foreground touch-manipulation"
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
          className="h-10 sm:h-9 w-full md:w-56 justify-start text-muted-foreground bg-background touch-manipulation"
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
  );
}
