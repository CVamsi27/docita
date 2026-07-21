"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";
import { useFacilityLabel } from "@/lib/formatters/facility-label";
import { logger } from "@/lib/monitoring/logger";
import { StaffWorkspaceSection, PatientBookingSection } from "./clinic-referral-share-toolbar-sections";

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
          <div className="flex flex-wrap items-center gap-2">
            {leadingActions}
          </div>
        ) : null}

        {showStaffBlock && clinicCode ? (
          <StaffWorkspaceSection
            clinicCode={clinicCode}
            canQuickShareClinicCode={canQuickShareClinicCode}
            isRail={isRail}
            copiedInvite={copiedInvite}
            copiedJoinCode={copiedJoinCode}
            facilityLabel={facilityLabel}
            onCopyInvite={() => void handleCopyFullInvite()}
            onCopyJoinCode={() => void handleCopyJoinCode()}
          />
        ) : null}

        {publicOnlineBookingUrl ? (
          <PatientBookingSection
            publicOnlineBookingUrl={publicOnlineBookingUrl}
            isRail={isRail}
            copiedBookingLink={copiedBookingLink}
            onCopyBookingLink={() => void handleCopyBookingLink()}
          />
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
