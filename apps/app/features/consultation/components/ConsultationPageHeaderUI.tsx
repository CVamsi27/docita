import {
  ArrowLeft,
  CreditCard,
  HeartPulse,
  MoreVertical,
  PanelLeft,
  Clock,
  User,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { cn } from "@workspace/ui/lib/utils";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { ConsultationTimerContainer } from "./ConsultationTimerContainer";
import { BillingModal } from "./modals/BillingModal";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useConsultationVitals } from "@/features/consultation/workspace/consultation-vitals-context";
import { SaveStatusChip } from "@/features/consultation/workspace/chrome/SaveStatusChip";

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
}: ConsultationPageHeaderUIProps) {
  const { openVitals } = useConsultationVitals();
  const [billingOpen, setBillingOpen] = useState(false);
  const queryClient = useQueryClient();

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
  const statusLabel = appointmentStatus
    ? humanizeUiLabel(appointmentStatus)
    : null;

  const typeLabel = appointmentType ? humanizeUiLabel(appointmentType) : null;

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Back"
            className="h-9 w-9 shrink-0 -ml-1 rounded-full text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {MobileSidebarContent && (
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-8 w-8 shrink-0"
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="sm:w-80 p-0">
                {MobileSidebarContent}
              </SheetContent>
            </Sheet>
          )}

          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-bold leading-tight truncate">
                  {patientName}
                </h1>
                {statusLabel && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs h-5 px-1.5 font-medium hidden sm:inline-flex border",
                      statusStyle,
                    )}
                  >
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
                  {new Date(appointmentDate).toLocaleDateString("en-IN", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  &middot;{" "}
                  {new Date(appointmentDate).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
            <SaveStatusChip className="hidden md:inline-flex max-w-[min(100%,14rem)] truncate" />
          )}
          {onToggleDesktopSidebar && (
            <Button
              variant="outline"
              size="sm"
              className="hidden xl:flex gap-1.5 h-8"
              onClick={onToggleDesktopSidebar}
              title={
                isDesktopSidebarOpen
                  ? "Hide patient history"
                  : "Show patient history"
              }
            >
              <PanelLeft className="h-3.5 w-3.5" />
              <span>
                {isDesktopSidebarOpen ? "Hide history" : "Show history"}
              </span>
            </Button>
          )}
          {!readOnly && (
            <>
              <ConsultationTimerContainer
                appointmentId={appointmentId}
                className="hidden sm:flex"
              />
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex gap-1.5 h-8"
                onClick={() => openVitals()}
                title="Record vital signs"
              >
                <HeartPulse className="h-3.5 w-3.5 text-destructive" />
                <span className="hidden md:inline">Vitals</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex gap-1.5 h-8"
                onClick={() => setBillingOpen(true)}
                title="Create invoice"
              >
                <CreditCard className="h-3.5 w-3.5 text-success" />
                <span className="hidden md:inline">Invoice</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="sm:hidden h-8 w-8"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openVitals()}>
                    <HeartPulse className="mr-2 h-4 w-4 text-destructive" />
                    Vitals
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setBillingOpen(true)}>
                    <CreditCard className="mr-2 h-4 w-4 text-success" />
                    Invoice
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          {readOnly && (
            <Badge variant="outline" className="hidden sm:inline-flex h-8 px-3">
              View only
            </Badge>
          )}
        </div>
      </header>

      <BillingModal
        open={billingOpen}
        onOpenChange={setBillingOpen}
        appointmentId={appointmentId}
        patientId={patientId ?? ""}
        onSaved={handleBillingSaved}
      />
    </>
  );
}
