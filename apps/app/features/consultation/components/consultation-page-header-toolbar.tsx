"use client";

import {
  CheckCircle2,
  Command as CommandIcon,
  CreditCard,
  HeartPulse,
  MoreVertical,
  PanelLeft,
  Sparkles,
} from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import {
  SymbolTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/overlay/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/overlay/dropdown-menu";
import { ConsultationTimerContainer } from "./ConsultationTimerContainer";
import { SaveStatusChip } from "@/features/consultation/workspace/chrome/SaveStatusChip";

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
      {onToggleDesktopSidebar ? (
        <SymbolTooltip
          label={
            isDesktopSidebarOpen
              ? "Hide patient history"
              : "Show patient history"
          }
          side="bottom"
        >
          <Button
            variant="outline"
            size="icon"
            className="hidden xl:inline-flex h-8 w-8"
            onClick={onToggleDesktopSidebar}
            aria-label={
              isDesktopSidebarOpen
                ? "Hide patient history"
                : "Show patient history"
            }
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </Button>
        </SymbolTooltip>
      ) : null}
      {!readOnly ? (
        <>
          <ConsultationTimerContainer
            appointmentId={appointmentId}
            className="hidden sm:flex"
          />
          <SymbolTooltip label="Record vital signs" side="bottom">
            <Button
              variant="outline"
              size="icon"
              className="hidden sm:inline-flex h-8 w-8"
              onClick={onOpenVitals}
              aria-label="Record vital signs"
            >
              <HeartPulse className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </SymbolTooltip>
        </>
      ) : null}
      {canCreateInvoice ? (
        <SymbolTooltip label="Create invoice" side="bottom">
          <Button
            variant="outline"
            size="icon"
            className="hidden sm:inline-flex h-8 w-8"
            onClick={onOpenBilling}
            aria-label="Create invoice"
          >
            <CreditCard className="h-3.5 w-3.5 text-success" />
          </Button>
        </SymbolTooltip>
      ) : null}
      <SymbolTooltip label="Ask AI about this consultation" side="bottom">
        <Button
          variant="outline"
          size="icon"
          className="hidden sm:inline-flex h-8 w-8"
          data-testid="consultation-ask-ai"
          onClick={onOpenAskAi}
          aria-label="Ask AI about this consultation"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </Button>
      </SymbolTooltip>
      {onOpenCommandPalette ? (
        <SymbolTooltip label="Quick actions (⌘K)" side="bottom">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCommandPalette}
            className="hidden sm:inline-flex gap-1.5 h-8"
            aria-label="Open quick actions"
          >
            <CommandIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border/70 bg-muted/40 px-1 py-0 text-[0.625rem] font-mono text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
        </SymbolTooltip>
      ) : null}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden h-8 w-8"
                aria-label="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">More actions</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          {!readOnly ? (
            <DropdownMenuItem onClick={onOpenVitals}>
              <HeartPulse className="mr-2 h-4 w-4 text-destructive" />
              Vitals
            </DropdownMenuItem>
          ) : null}
          {canCreateInvoice ? (
            <DropdownMenuItem onClick={onOpenBilling}>
              <CreditCard className="mr-2 h-4 w-4 text-success" />
              Invoice
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={onOpenAskAi}>
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            Ask AI
          </DropdownMenuItem>
          {onOpenCommandPalette ? (
            <DropdownMenuItem onClick={onOpenCommandPalette}>
              <CommandIcon className="mr-2 h-4 w-4" />
              Quick actions
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {!readOnly && onMarkDone ? (
        <SymbolTooltip
          label={markDoneDisabledReason ?? "Mark consultation done"}
          side="bottom"
        >
          <span className="inline-flex">
            <Button
              size="sm"
              onClick={onMarkDone}
              disabled={isMarkingDone || !canMarkDone}
              className="gap-1.5 h-8"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isMarkingDone ? "Marking…" : "Mark done"}</span>
            </Button>
          </span>
        </SymbolTooltip>
      ) : null}
    </div>
  );
}
