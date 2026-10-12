import { CheckCircle2, Command as CommandIcon, CreditCard, HeartPulse, MoreVertical, PencilLine, Sparkles } from "lucide-react";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, SymbolTooltip, Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components";
import { ConsultationTimerContainer } from "./ConsultationTimerContainer";

interface ConsultationToolbarPrimaryActionsProps {
  readOnly: boolean;
  appointmentId: string;
  canCreateInvoice: boolean;
  existingInvoiceStatus?: string | null;
  onOpenVitals: () => void;
  onOpenBilling: () => void;
}

/** Timer + vitals + invoice quick actions — split out so the toolbar isn't one monolithic JSX tree. */
export function ConsultationToolbarPrimaryActions({
  readOnly,
  appointmentId,
  canCreateInvoice,
  existingInvoiceStatus,
  onOpenVitals,
  onOpenBilling,
}: ConsultationToolbarPrimaryActionsProps) {
  const hasOpenInvoice =
    existingInvoiceStatus === "PENDING" ||
    existingInvoiceStatus === "PARTIALLY_PAID";
  return (
    <>
      {!readOnly ? (
        <>
          <ConsultationTimerContainer
            appointmentId={appointmentId}
            className="hidden sm:flex"
          />
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex gap-1.5 h-8"
            onClick={onOpenVitals}
          >
            <HeartPulse
              className="h-3.5 w-3.5 text-destructive"
              aria-hidden="true"
            />
            Vitals
          </Button>
        </>
      ) : null}
      {canCreateInvoice ? (
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex gap-1.5 h-8"
          onClick={onOpenBilling}
          aria-label={hasOpenInvoice ? "Edit invoice" : "Create invoice"}
        >
          {hasOpenInvoice ? (
            <PencilLine
              className="h-3.5 w-3.5 text-success"
              aria-hidden="true"
            />
          ) : (
            <CreditCard
              className="h-3.5 w-3.5 text-success"
              aria-hidden="true"
            />
          )}
          {hasOpenInvoice ? "Edit Invoice" : "Invoice"}
        </Button>
      ) : null}
    </>
  );
}

interface ConsultationToolbarUtilityActionsProps {
  onOpenAskAi: () => void;
  onOpenCommandPalette?: () => void;
}

/** Ask-AI + command-palette quick actions (desktop strip) — split out of the toolbar's flat JSX tree. */
export function ConsultationToolbarUtilityActions({
  onOpenAskAi,
  onOpenCommandPalette,
}: ConsultationToolbarUtilityActionsProps) {
  return (
    <>
      <span
        className="hidden sm:block h-5 w-px shrink-0 bg-border"
        aria-hidden="true"
      />
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
            <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border/70 bg-muted/40 px-1 py-0 text-[var(--fs-2xs)] font-mono text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
        </SymbolTooltip>
      ) : null}
    </>
  );
}

interface ConsultationToolbarMobileMenuProps {
  readOnly: boolean;
  canCreateInvoice: boolean;
  existingInvoiceStatus?: string | null;
  onOpenVitals: () => void;
  onOpenBilling: () => void;
  onOpenAskAi: () => void;
  onOpenCommandPalette?: () => void;
}

/** The collapsed "more actions" dropdown shown on small screens — split out so the desktop strip and mobile menu can each be scanned independently. */
export function ConsultationToolbarMobileMenu({
  readOnly,
  canCreateInvoice,
  existingInvoiceStatus,
  onOpenVitals,
  onOpenBilling,
  onOpenAskAi,
  onOpenCommandPalette,
}: ConsultationToolbarMobileMenuProps) {
  const hasOpenInvoice =
    existingInvoiceStatus === "PENDING" ||
    existingInvoiceStatus === "PARTIALLY_PAID";
  return (
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
            {hasOpenInvoice ? (
              <PencilLine className="mr-2 h-4 w-4 text-success" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4 text-success" />
            )}
            {hasOpenInvoice ? "Edit Invoice" : "Invoice"}
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
  );
}

interface ConsultationToolbarMarkDoneActionProps {
  readOnly: boolean;
  onMarkDone?: () => void;
  isMarkingDone: boolean;
  canMarkDone: boolean;
  markDoneDisabledReason?: string;
}

/** "Mark consultation done" action + its leading separator — split out as its own self-contained, independently gated action. */
export function ConsultationToolbarMarkDoneAction({
  readOnly,
  onMarkDone,
  isMarkingDone,
  canMarkDone,
  markDoneDisabledReason,
}: ConsultationToolbarMarkDoneActionProps) {
  if (readOnly || !onMarkDone) return null;

  return (
    <>
      <span
        className="hidden sm:block h-5 w-px shrink-0 bg-border"
        aria-hidden="true"
      />
      <SymbolTooltip
        label={markDoneDisabledReason ?? "Mark consultation done"}
        side="bottom"
      >
        <span className="inline-flex">
          <Button
            size="sm"
            onClick={onMarkDone}
            disabled={isMarkingDone || !canMarkDone}
            className="gap-1.5 h-8 font-semibold shadow-xs"
            aria-label={isMarkingDone ? "Marking consultation done" : "Mark consultation done"}
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="inline">
              {isMarkingDone ? "Marking…" : "Mark done"}
            </span>
          </Button>
        </span>
      </SymbolTooltip>
    </>
  );
}


