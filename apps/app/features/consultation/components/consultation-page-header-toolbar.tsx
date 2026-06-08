"use client";

import { SaveStatusChip } from "@/features/consultation/workspace/chrome/SaveStatusChip";
import {
  ConsultationToolbarMarkDoneAction,
  ConsultationToolbarMobileMenu,
  ConsultationToolbarPrimaryActions,
  ConsultationToolbarSidebarToggle,
  ConsultationToolbarUtilityActions,
} from "./consultation-page-header-toolbar-sections";

interface ConsultationPageHeaderToolbarProps {
  readOnly: boolean;
  appointmentId: string;
  canCreateInvoice: boolean;
  isDesktopSidebarOpen: boolean;
  onToggleDesktopSidebar?: () => void;
  onOpenCommandPalette?: () => void;
  onMarkDone?: () => void;
  isMarkingDone: boolean;
  canMarkDone?: boolean;
  markDoneDisabledReason?: string;
  onOpenVitals: () => void;
  onOpenBilling: () => void;
  onOpenAskAi: () => void;
}

export function ConsultationPageHeaderToolbar({
  readOnly,
  appointmentId,
  canCreateInvoice,
  isDesktopSidebarOpen,
  onToggleDesktopSidebar,
  onOpenCommandPalette,
  onMarkDone,
  isMarkingDone,
  canMarkDone = true,
  markDoneDisabledReason,
  onOpenVitals,
  onOpenBilling,
  onOpenAskAi,
}: ConsultationPageHeaderToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
      {!readOnly ? (
        <SaveStatusChip className="max-w-[min(100%,14rem)] truncate" />
      ) : null}
      <ConsultationToolbarPrimaryActions
        readOnly={readOnly}
        appointmentId={appointmentId}
        canCreateInvoice={canCreateInvoice}
        onOpenVitals={onOpenVitals}
        onOpenBilling={onOpenBilling}
      />
      <ConsultationToolbarUtilityActions
        onOpenAskAi={onOpenAskAi}
        onOpenCommandPalette={onOpenCommandPalette}
      />
      <ConsultationToolbarMobileMenu
        readOnly={readOnly}
        canCreateInvoice={canCreateInvoice}
        onOpenVitals={onOpenVitals}
        onOpenBilling={onOpenBilling}
        onOpenAskAi={onOpenAskAi}
        onOpenCommandPalette={onOpenCommandPalette}
      />
      <ConsultationToolbarMarkDoneAction
        readOnly={readOnly}
        onMarkDone={onMarkDone}
        isMarkingDone={isMarkingDone}
        canMarkDone={canMarkDone}
        markDoneDisabledReason={markDoneDisabledReason}
      />
      <ConsultationToolbarSidebarToggle
        isDesktopSidebarOpen={isDesktopSidebarOpen}
        onToggleDesktopSidebar={onToggleDesktopSidebar}
      />
    </div>
  );
}
