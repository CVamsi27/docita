import {
  ArrowLeft,
  CheckCircle2,
  Command as CommandIcon,
  CreditCard,
  HeartPulse,
  Lock,
  MoreVertical,
  PanelLeft,
  Sparkles,
  Clock,
} from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/overlay/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@workspace/ui/components/overlay/sheet";
import { cn } from "@workspace/ui/lib/utils";
import { formatClockTime, formatDate } from "@/lib/formatters";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { ConsultationTimerContainer } from "./ConsultationTimerContainer";
import { BillingModal } from "./modals/BillingModal";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useConsultationVitals } from "@/features/consultation/workspace/consultation-vitals-context";
import { SaveStatusChip } from "@/features/consultation/workspace/chrome/SaveStatusChip";
import { usePermissions } from "@/hooks/use-permissions";
import { getInitials } from "@/lib/formatters/text-helpers";

const STATUS_STYLES: Record<string, string> = {
  scheduled: "badge-info",
  in_progress: "badge-success",
  completed: "badge-muted",
  cancelled: "badge-danger",
  no_show: "badge-warning",
};

interface ConsultationPageHeaderUIProps {
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
      queryKey: ["appointments", appointmentId],
    });
    queryClient.invalidateQueries({ queryKey: ["billing"] });
  };

  const statusKey = (appointmentStatus ?? "").toLowerCase().replace(/-/g, "_");
  const statusStyle =
    STATUS_STYLES[statusKey] ??
    "bg-muted/50 text-muted-foreground border-muted";
  const rawStatusLabel = appointmentStatus
    ? humanizeUiLabel(appointmentStatus)
    : null;
  const statusLabel = readOnly
    ? rawStatusLabel
      ? `${rawStatusLabel} · View only`
      : "View only"
    : rawStatusLabel;

  const typeLabel = appointmentType ? humanizeUiLabel(appointmentType) : null;

  const [firstName, ...rest] = patientName.split(" ");
  const lastName = rest.join(" ");
  const initials = getInitials(firstName ?? patientName, lastName || undefined);

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

          {MobileSidebarContent && (
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
          )}

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
                {statusLabel && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs h-5 px-1.5 font-medium hidden sm:inline-flex border gap-1",
                      statusStyle,
                    )}
                  >
                    {readOnly && (
                      <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                    )}
                    {statusLabel}
                  </Badge>
                )}
                {typeLabel && (
                  <Badge
                    variant="outline"
                    className="text-xs h-5 px-1.5 hidden md:inline-flex"
                  >
                    {typeLabel}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <Clock className="h-3 w-3 shrink-0" />
                <span>
                  {formatDate(appointmentDate, "EEE, d MMM")}{" "}
                  &middot;{" "}
                  {formatClockTime(appointmentDate)}
                </span>
                {chiefComplaint && (
                  <span className="hidden md:inline truncate max-w-[150px] lg:max-w-[250px]">
                    &middot; {chiefComplaint}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          {!readOnly && (
            <SaveStatusChip className="max-w-[min(100%,14rem)] truncate" />
          )}
          {onToggleDesktopSidebar && (
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
          )}
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
                  onClick={() => openVitals()}
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
                onClick={() => setBillingOpen(true)}
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
              onClick={() =>
                openOverlay({
                  id: `consultation:${appointmentId}`,
                  label: `on ${patientName}'s consultation`,
                  payload: { appointmentId, patientId },
                })
              }
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
                <DropdownMenuItem onClick={() => openVitals()}>
                  <HeartPulse className="mr-2 h-4 w-4 text-destructive" />
                  Vitals
                </DropdownMenuItem>
              ) : null}
              {canCreateInvoice ? (
                <DropdownMenuItem onClick={() => setBillingOpen(true)}>
                  <CreditCard className="mr-2 h-4 w-4 text-success" />
                  Invoice
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onClick={() =>
                  openOverlay({
                    id: `consultation:${appointmentId}`,
                    label: `on ${patientName}'s consultation`,
                    payload: { appointmentId, patientId },
                  })
                }
              >
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
            <Button
              size="sm"
              onClick={onMarkDone}
              disabled={isMarkingDone}
              className="gap-1.5 h-8"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isMarkingDone ? "Marking…" : "Mark done"}</span>
            </Button>
          ) : null}
        </div>
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
