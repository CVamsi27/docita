import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { ConsultationSidebarContainer } from "@/features/consultation/components/ConsultationSidebarContainer";
import type { Appointment, PatientWithMedicalHistory } from "@workspace/types";

interface ConsultationRightRailProps {
  isSidebarOpen: boolean;
  onToggle: () => void;
  appointmentData: Appointment & { patient?: PatientWithMedicalHistory };
}

export function ConsultationRightRail({
  isSidebarOpen,
  onToggle,
  appointmentData,
}: ConsultationRightRailProps) {
  if (!isSidebarOpen) {
    // Collapsed: a thin rail sitting on the divider with an expand affordance.
    return (
      <aside
        className="hidden xl:flex w-9 shrink-0 flex-col items-center border-l bg-muted/10 py-3"
        aria-label="Patient context (collapsed)"
      >
        <SymbolTooltip label="Show patient panel" side="left">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            aria-label="Show patient panel"
            className={cn(
              "flex size-7 items-center justify-center rounded-md text-muted-foreground",
              "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <PanelRightOpen className="size-4" aria-hidden="true" />
          </Button>
        </SymbolTooltip>
        <span
          className="mt-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 [writing-mode:vertical-rl]"
          aria-hidden="true"
        >
          Patient
        </span>
      </aside>
    );
  }

  return (
    <aside
      className="hidden xl:flex relative w-80 shrink-0 border-l bg-muted/10"
      aria-label="Patient context"
    >
      <SymbolTooltip label="Hide patient panel" side="left">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onToggle}
          aria-label="Hide patient panel"
          className={cn(
            "absolute -left-3 top-4 z-10 flex size-6 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm",
            "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <PanelRightClose className="size-3.5" aria-hidden="true" />
        </Button>
      </SymbolTooltip>
      <div className="min-w-0 flex-1 overflow-hidden">
        <ConsultationSidebarContainer appointmentData={appointmentData} />
      </div>
    </aside>
  );
}
