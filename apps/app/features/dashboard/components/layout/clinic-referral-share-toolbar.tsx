"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Check, Copy, Search, Share2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useFacilityLabel } from "@/lib/facility-label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

function bookingButtonLabel(publicOnlineBookingUrl: string): string {
  try {
    return new URL(publicOnlineBookingUrl).pathname;
  } catch {
    return "Booking link";
  }
}

export interface ClinicReferralShareToolbarProps {
  clinicCode?: string | null;
  clinicName?: string;
  publicOnlineBookingUrl?: string | null;
  canQuickShareClinicCode?: boolean;
  /** Rendered first (e.g. refresh controls on the legacy dashboard header). */
  leadingActions?: ReactNode;
  /** Rendered last (e.g. command palette search). */
  trailingActions?: ReactNode;
}

export function ClinicReferralShareToolbar({
  clinicCode,
  clinicName,
  publicOnlineBookingUrl,
  canQuickShareClinicCode = false,
  leadingActions,
  trailingActions,
}: ClinicReferralShareToolbarProps) {
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
      <div className="flex flex-wrap items-center gap-2 md:justify-end md:shrink-0">
        {leadingActions}
        {canQuickShareClinicCode ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={() => void handleQuickShare()}
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
        ) : null}
        {clinicCode ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={() => void handleCopyCode()}
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
                className="h-9 max-w-full gap-1.5 px-3 text-xs text-muted-foreground hover:text-foreground touch-manipulation"
                title={publicOnlineBookingUrl}
              >
                <span className="min-w-0 truncate font-mono">
                  {bookingButtonLabel(publicOnlineBookingUrl)}
                </span>
                {copiedBookingLink ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5 shrink-0" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span className="break-all">{publicOnlineBookingUrl}</span>
            </TooltipContent>
          </Tooltip>
        ) : null}
        {trailingActions}
      </div>
    </TooltipProvider>
  );
}

export function ClinicReferralShareSearchButton({
  onSearchClick,
}: {
  onSearchClick: () => void;
}) {
  return (
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
  );
}
