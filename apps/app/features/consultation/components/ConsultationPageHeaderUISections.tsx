"use client";

import { ArrowLeft, Clock, Lock, PanelLeft } from "lucide-react";
import { Avatar, AvatarFallback, Badge, Button, Sheet, SheetContent, SheetTrigger, SymbolTooltip, Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import { formatClockTime, formatDate } from "@/lib/formatters";
import type { ConsultationHeaderDisplay } from "./consultation-page-header-helpers";

interface ConsultationHeaderNavControlsProps {
  onBack: () => void;
  MobileSidebarContent?: React.ReactNode;
}

/** Back button + mobile patient-chart sheet trigger — split out so the identity block isn't bundled with page navigation. */
export function ConsultationHeaderNavControls({
  onBack,
  MobileSidebarContent,
}: ConsultationHeaderNavControlsProps) {
  return (
    <>
      <SymbolTooltip label="Back">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label="Back"
          className="h-9 w-9 shrink-0 -ml-1 rounded-full text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </SymbolTooltip>

      {MobileSidebarContent ? (
        <Sheet>
          <Tooltip>
            <TooltipTrigger asChild>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="xl:hidden h-8 w-8 shrink-0"
                  aria-label="Open patient chart and history"
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </SheetTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Patient chart and history
            </TooltipContent>
          </Tooltip>
          <SheetContent side="left" className="sm:w-80 p-0">
            {MobileSidebarContent}
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}

interface ConsultationHeaderPatientSummaryProps {
  display: ConsultationHeaderDisplay;
  patientName: string;
  readOnly: boolean;
  appointmentDate: string | Date;
  chiefComplaint?: string;
}

/** Avatar + name/status badges + date/time line — split out as the header's self-contained "who and when" identity unit. */
export function ConsultationHeaderPatientSummary({
  display,
  patientName,
  readOnly,
  appointmentDate,
  chiefComplaint,
}: ConsultationHeaderPatientSummaryProps) {
  const { initials, statusLabel, statusStyle, typeLabel } = display;

  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="border border-primary/20 bg-primary/5 text-primary text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-sm font-bold leading-tight truncate">
            {patientName}
          </h1>
          {statusLabel ? (
            <Badge
              variant="outline"
              className={cn(
                "text-xs h-5 px-1.5 font-medium hidden sm:inline-flex border gap-1",
                statusStyle,
              )}
            >
              {readOnly ? (
                <Lock className="h-2.5 w-2.5" aria-hidden="true" />
              ) : null}
              {statusLabel}
            </Badge>
          ) : null}
          {typeLabel ? (
            <Badge
              variant="outline"
              className="text-xs h-5 px-1.5 hidden md:inline-flex"
            >
              {typeLabel}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 min-w-0">
          <Clock className="h-3 w-3 shrink-0" />
          <span className="truncate whitespace-nowrap">
            {formatDate(appointmentDate, "EEE, d MMM")} &middot;{" "}
            {formatClockTime(appointmentDate)}
          </span>
          {chiefComplaint ? (
            <span className="hidden md:inline truncate max-w-[150px] lg:max-w-[250px]">
              &middot; {chiefComplaint}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
