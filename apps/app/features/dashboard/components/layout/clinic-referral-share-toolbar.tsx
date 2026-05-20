"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { CalendarDays, Check, Copy, Share2, Users } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { useFacilityLabel } from "@/lib/formatters/facility-label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/overlay/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { logger } from "@/lib/monitoring/logger";

export interface ClinicReferralShareToolbarProps {
  clinicCode?: string | null;
  clinicName?: string;
  publicOnlineBookingUrl?: string | null;
  canQuickShareClinicCode?: boolean;
  /**
   * `rail`: vertical stack, full width of the column (Today page right rail above advisor cards).
   * `default`: horizontal wrap for dashboard header.
   */
  variant?: "default" | "rail";
  /** Rendered first (e.g. refresh controls on the legacy dashboard header). */
  leadingActions?: ReactNode;
  /** Rendered last (optional extra controls). */
  trailingActions?: ReactNode;
}

function bookingPathLabel(publicOnlineBookingUrl: string): string {
  try {
    return new URL(publicOnlineBookingUrl).pathname;
  } catch {
    return "Booking page";
  }
}

export function ClinicReferralShareToolbar({
  clinicCode,
  clinicName,
  publicOnlineBookingUrl,
  canQuickShareClinicCode = false,
  variant = "default",
  leadingActions,
  trailingActions,
}: ClinicReferralShareToolbarProps) {
  const [copiedJoinCode, setCopiedJoinCode] = useState(false);
  const [copiedBookingLink, setCopiedBookingLink] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const facilityLabel = useFacilityLabel();

  const showStaffBlock = Boolean(clinicCode);

  const handleCopyJoinCode = async () => {
    if (!clinicCode) return;
    await navigator.clipboard.writeText(clinicCode);
    setCopiedJoinCode(true);
    setTimeout(() => setCopiedJoinCode(false), 2000);
  };

  const handleCopyBookingLink = async () => {
    if (!publicOnlineBookingUrl) return;
    await navigator.clipboard.writeText(publicOnlineBookingUrl);
    setCopiedBookingLink(true);
    setTimeout(() => setCopiedBookingLink(false), 2000);
  };

  const handleCopyFullInvite = async () => {
    if (!clinicCode) return;

    const bookingLine = publicOnlineBookingUrl
      ? `Patient booking page (no login): ${publicOnlineBookingUrl}\n`
      : "";
    const shareText = `${bookingLine}Staff join code for Docita (${facilityLabel}): ${clinicCode}\nJoin ${clinicName || `our ${facilityLabel.toLowerCase()}`} on Docita with this code in the app.`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Join ${facilityLabel} on Docita`,
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
      }
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      try {
        await navigator.clipboard.writeText(shareText);
        setCopiedInvite(true);
        setTimeout(() => setCopiedInvite(false), 2000);
      } catch (clipboardError) {
        logger.warn("Failed to copy clinic referral share text", {
          error: clipboardError,
        });
      }
    }
  };

  const isRail = variant === "rail";

  return (
    <TooltipProvider>
      <div
        className={
          isRail
            ? "flex w-full min-w-0 flex-col gap-3.5"
            : "flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end"
        }
      >
        {leadingActions ? (
          <div className="flex flex-wrap items-center gap-2">{leadingActions}</div>
        ) : null}

        {showStaffBlock ? (
          <div
            className={cn(
              "flex min-w-0 max-w-full flex-col gap-2.5 rounded-[var(--radius-md)] border border-border/70 bg-muted/15 px-3.5 py-3.5 shadow-sm ring-1 ring-border/20 transition-colors duration-150",
              isRail
                ? "w-full"
                : "sm:max-w-[min(100%,20rem)]",
            )}
            role="group"
            aria-labelledby="clinic-share-staff-label"
          >
            <div className="space-y-1">
              <MicroLabel as="h3" id="clinic-share-staff-label">
                Staff workspace
              </MicroLabel>
              <p className="text-[length:var(--fs-xs)] leading-snug text-muted-foreground">
                For teammates joining this {facilityLabel.toLowerCase()} in Docita.
                Not for patients.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {canQuickShareClinicCode ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={() => void handleCopyFullInvite()}
                      disabled={!clinicCode}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-10 gap-1.5 px-3 text-[length:var(--fs-xs)] touch-manipulation transition-colors duration-150 sm:h-9",
                        isRail && "w-full justify-center sm:w-auto sm:justify-start",
                      )}
                    >
                      {copiedInvite ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                      ) : (
                        <Share2 className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>
                        {copiedInvite ? "Copied" : "Copy invite text"}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-left">
                    Copies the staff join code and the patient booking link in one
                    block for email or chat.
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {clinicCode ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={() => void handleCopyJoinCode()}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-10 min-w-0 max-w-full gap-1.5 px-3 text-[length:var(--fs-xs)] touch-manipulation transition-colors duration-150 sm:h-9",
                        isRail && "w-full justify-center sm:w-auto sm:justify-start",
                      )}
                      title={clinicCode}
                    >
                      <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="min-w-0 truncate font-mono font-medium tracking-wide">
                        {clinicCode}
                      </span>
                      {copiedJoinCode ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 shrink-0" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Copy staff join code only ({clinicCode})
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          </div>
        ) : null}

        {publicOnlineBookingUrl ? (
          <div
            className={cn(
              "flex min-w-0 max-w-full flex-col gap-2.5 rounded-[var(--radius-md)] border border-border/70 bg-muted/15 px-3.5 py-3.5 shadow-sm ring-1 ring-border/20 transition-colors duration-150",
              isRail ? "w-full" : "sm:max-w-[min(100%,20rem)]",
            )}
            role="group"
            aria-labelledby="clinic-share-patient-label"
          >
            <div className="space-y-1">
              <MicroLabel as="h3" id="clinic-share-patient-label">
                Patient booking
              </MicroLabel>
              <p className="text-[length:var(--fs-xs)] leading-snug text-muted-foreground">
                Public page to request an appointment. Patients do not use the join
                code above.
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  onClick={() => void handleCopyBookingLink()}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-10 min-w-0 justify-start gap-2 px-3 text-[length:var(--fs-xs)] touch-manipulation transition-colors duration-150 sm:h-9",
                    isRail
                      ? "w-full"
                      : "w-full sm:w-auto sm:max-w-full",
                  )}
                  title={publicOnlineBookingUrl}
                >
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="min-w-0 truncate font-mono">
                    {bookingPathLabel(publicOnlineBookingUrl)}
                  </span>
                  {copiedBookingLink ? (
                    <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-success" />
                  ) : (
                    <Copy className="ml-auto h-3.5 w-3.5 shrink-0" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm break-all text-left">
                {publicOnlineBookingUrl}
              </TooltipContent>
            </Tooltip>
          </div>
        ) : null}

        {trailingActions ? (
          <div
            className={
              isRail
                ? "flex w-full flex-wrap items-center gap-2"
                : "flex flex-wrap items-center gap-2 sm:ml-auto sm:self-center"
            }
          >
            {trailingActions}
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
