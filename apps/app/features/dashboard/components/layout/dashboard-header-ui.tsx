import type { ReactNode } from "react";
import { Check, Copy, Search, Share2, Stethoscope } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useState } from "react";
import { formatDate } from "@/lib/formatters";
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
  /** Public online booking page URL for this clinic (e.g. for Google Maps). */
  publicOnlineBookingUrl?: string | null;
  canQuickShareClinicCode?: boolean;
  summary?: string;
  /** Extra controls (e.g. refresh) rendered before clinic/search actions. */
  headerActions?: ReactNode;
}

export function DashboardHeaderUI({
  userName,
  greeting,
  onSearchClick,
  clinicCode,
  clinicName,
  publicOnlineBookingUrl,
  canQuickShareClinicCode = false,
  summary,
  headerActions,
}: DashboardHeaderUIProps) {
  const [copied, setCopied] = useState(false);
  const [copiedBookingLink, setCopiedBookingLink] = useState(false);
  const [shared, setShared] = useState(false);
  const facilityLabel = useFacilityLabel();

  const handleCopyCode = async () => {
    if (!clinicCode) return;
    await navigator.clipboard.writeText(clinicCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyBookingLink = async () => {
    if (!publicOnlineBookingUrl) return;
    await navigator.clipboard.writeText(publicOnlineBookingUrl);
    setCopiedBookingLink(true);
    setTimeout(() => setCopiedBookingLink(false), 2000);
  };

  const handleQuickShare = async () => {
    if (!clinicCode) return;

    const bookingLine = publicOnlineBookingUrl
      ? `Book online: ${publicOnlineBookingUrl}\n`
      : "";
    const shareText = `${bookingLine}Join ${clinicName || `our ${facilityLabel.toLowerCase()}`} on Docita using ${facilityLabel.toLowerCase()} code: ${clinicCode}`;

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
      <header className="flex flex-col gap-3 md:gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm sm:h-12 sm:w-12"
              aria-hidden
            >
              <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="ui-copy-stack min-w-0">
              <p className="ui-helper-text">
                {formatDate(new Date(), "en-IN", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <h1 className="ui-page-title">
                {greeting}, {userName}!
              </h1>
              {summary ? (
                <p className="ui-page-subtitle max-w-2xl">{summary}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:justify-end md:shrink-0">
            {headerActions}
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
                      <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                    ) : (
                      <Share2 className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>{shared ? "Shared" : "Quick Share"}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Quick Share</TooltipContent>
              </Tooltip>
            )}
            {clinicCode ? (
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
                      <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 shrink-0" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy code</TooltipContent>
              </Tooltip>
            ) : null}
            {publicOnlineBookingUrl ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    onClick={() => void handleCopyBookingLink()}
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 px-3 text-xs text-muted-foreground hover:text-foreground touch-manipulation"
                  >
                    <span className="max-w-[140px] truncate sm:max-w-[200px]">
                      Booking link
                    </span>
                    {copiedBookingLink ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 shrink-0" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy public booking link</TooltipContent>
              </Tooltip>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-full justify-start touch-manipulation sm:h-9 md:w-auto md:justify-center text-muted-foreground bg-background"
              onClick={onSearchClick}
            >
              <Search className="mr-2 h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Search patients…</span>
              <span className="sm:hidden">Search</span>
              <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium sm:flex">
                ⌘K
              </kbd>
            </Button>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
