"use client";

import { ArrowLeft, Clock, Lock, PanelLeft } from "lucide-react";
import { queryKeys } from "@workspace/data-access";
import { useAskAi } from "@/components/ask-ai/ask-ai-context";
import { Avatar, AvatarFallback } from "@workspace/ui/components/indicators/avatar";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  SymbolTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/overlay/tooltip";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@workspace/ui/components/overlay/sheet";
import { cn } from "@workspace/ui/lib/utils";
import { formatClockTime, formatDate } from "@/lib/formatters";
import { BillingModal } from "./modals/BillingModal";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useConsultationVitals } from "@/features/consultation/workspace/consultation-vitals-context";
import { usePermissions } from "@/hooks/use-permissions";
import { buildConsultationHeaderDisplay } from "./consultation-page-header-helpers";
import { ConsultationPageHeaderToolbar } from "./consultation-page-header-toolbar";

export interface ConsultationPageHeaderUIProps {
  patientName: string;
  appointmentDate: string | Date;
  appointmentId: string;
  patientId?: string;
  appointmentType?: string;
  appointmentStatus?: string;
  readOnly?: boolean;
  chiefComplaint?: string;
  onBack: () => void;
  MobileSidebarContent?: React.ReactNode;
  isDesktopSidebarOpen?: boolean;
  onToggleDesktopSidebar?: () => void;
  onOpenCommandPalette?: () => void;
  onMarkDone?: () => void;
  isMarkingDone?: boolean;
}

export function ConsultationPageHeaderUI({
  patientName,
  appointmentDate,
  appointmentId,
  patientId,
  appointmentType,
  appointmentStatus,
  readOnly = false,
  chiefComplaint,
  onBack,
  MobileSidebarContent,
  isDesktopSidebarOpen = true,
  onToggleDesktopSidebar,
  onOpenCommandPalette,
  onMarkDone,
  isMarkingDone = false,
}: ConsultationPageHeaderUIProps) {
  const { openVitals } = useConsultationVitals();
  const { openOverlay } = useAskAi();
  const { canCreateInvoice } = usePermissions();
  const [billingOpen, setBillingOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!canCreateInvoice) {
      setBillingOpen(false);
    }
  }, [canCreateInvoice]);

  const handleBillingSaved = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.appointments.detail(appointmentId),
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.all() });
  };

  const { statusStyle, statusLabel, typeLabel, initials } =
    buildConsultationHeaderDisplay({
      patientName,
      appointmentStatus,
      appointmentType,
      readOnly,
    });

  const openAskAi = () =>
    openOverlay({
      id: `consultation:${appointmentId}`,
      label: `on ${patientName}'s consultation`,
      payload: { appointmentId, patientId },
    });

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
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

          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="border border-border/70 bg-background/70 text-foreground text-xs font-semibold">
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <Clock className="h-3 w-3 shrink-0" />
                <span>
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
        </div>

        <ConsultationPageHeaderToolbar
          readOnly={readOnly}
          appointmentId={appointmentId}
          canCreateInvoice={canCreateInvoice}
          isDesktopSidebarOpen={isDesktopSidebarOpen}
          onToggleDesktopSidebar={onToggleDesktopSidebar}
          onOpenCommandPalette={onOpenCommandPalette}
          onMarkDone={onMarkDone}
          isMarkingDone={isMarkingDone}
          onOpenVitals={() => openVitals()}
          onOpenBilling={() => setBillingOpen(true)}
          onOpenAskAi={openAskAi}
        />
      </header>

      {canCreateInvoice ? (
        <BillingModal
          open={billingOpen}
          onOpenChange={setBillingOpen}
          appointmentId={appointmentId}
          patientId={patientId ?? ""}
          onSaved={handleBillingSaved}
        />
      ) : null}
    </>
  );
}
