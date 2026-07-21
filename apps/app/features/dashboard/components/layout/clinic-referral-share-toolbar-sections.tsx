"use client";

import { CalendarDays, Check, Copy, Share2, Users } from "lucide-react";
import {
  Button,
  MicroLabel,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";

export function bookingPathLabel(publicOnlineBookingUrl: string): string {
  try {
    return new URL(publicOnlineBookingUrl).pathname;
  } catch {
    return "Booking page";
  }
}

interface StaffWorkspaceSectionProps {
  clinicCode: string;
  canQuickShareClinicCode: boolean;
  isRail: boolean;
  copiedInvite: boolean;
  copiedJoinCode: boolean;
  facilityLabel: string;
  onCopyInvite: () => void;
  onCopyJoinCode: () => void;
}

export function StaffWorkspaceSection({
  clinicCode,
  canQuickShareClinicCode,
  isRail,
  copiedInvite,
  copiedJoinCode,
  facilityLabel,
  onCopyInvite,
  onCopyJoinCode,
}: StaffWorkspaceSectionProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full flex-col gap-2.5 rounded-[var(--radius-md)] border border-border/70 bg-muted/15 px-3.5 py-3.5 shadow-sm ring-1 ring-border/20 transition-colors duration-150",
        isRail ? "w-full" : "sm:max-w-[min(100%,20rem)]",
      )}
      role="group"
      aria-labelledby="clinic-share-staff-label"
    >
      <div className="space-y-1">
        <MicroLabel as="h3" id="clinic-share-staff-label">
          Staff workspace
        </MicroLabel>
        <p className="text-[length:var(--fs-xs)] leading-snug text-muted-foreground">
          For teammates joining this {facilityLabel.toLowerCase()} in
          Docita. Not for patients.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {canQuickShareClinicCode ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={onCopyInvite}
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
                <span>{copiedInvite ? "Copied" : "Copy invite text"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-left">
              Copies the staff join code and the patient booking link in
              one block for email or chat.
            </TooltipContent>
          </Tooltip>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              onClick={onCopyJoinCode}
              variant="outline"
              size="sm"
              className={cn(
                "h-10 min-w-0 max-w-full gap-1.5 px-3 text-[length:var(--fs-xs)] touch-manipulation transition-colors duration-150 sm:h-9",
                isRail && "w-full justify-center sm:w-auto sm:justify-start",
              )}
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
      </div>
    </div>
  );
}

interface PatientBookingSectionProps {
  publicOnlineBookingUrl: string;
  isRail: boolean;
  copiedBookingLink: boolean;
  onCopyBookingLink: () => void;
}

export function PatientBookingSection({
  publicOnlineBookingUrl,
  isRail,
  copiedBookingLink,
  onCopyBookingLink,
}: PatientBookingSectionProps) {
  return (
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
          Public page to request an appointment. Patients do not use the
          join code above.
        </p>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            onClick={onCopyBookingLink}
            variant="outline"
            size="sm"
            className={cn(
              "h-10 min-w-0 justify-start gap-2 px-3 text-[length:var(--fs-xs)] touch-manipulation transition-colors duration-150 sm:h-9",
              isRail ? "w-full" : "w-full sm:w-auto sm:max-w-full",
            )}
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
  );
}
