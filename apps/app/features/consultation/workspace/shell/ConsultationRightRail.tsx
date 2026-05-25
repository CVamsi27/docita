"use client";

import { cn } from "@workspace/ui/lib/utils";
import { ConsultationSidebarContainer } from "@/features/consultation/components/ConsultationSidebarContainer";
import type { Appointment, PatientWithMedicalHistory } from "@workspace/types";

interface ConsultationRightRailProps {
  isSidebarOpen: boolean;
  appointmentData: Appointment & { patient?: PatientWithMedicalHistory };
}

export function ConsultationRightRail({
  isSidebarOpen,
  appointmentData,
}: ConsultationRightRailProps) {
  return (
    <aside
      className={cn(
        "hidden xl:flex shrink-0 bg-muted/10 transition-[width,border-color] duration-200 overflow-hidden",
        isSidebarOpen ? "w-80 border-l" : "w-0 border-l-0",
      )}
      aria-hidden={!isSidebarOpen}
    >
      {isSidebarOpen ? (
        <ConsultationSidebarContainer appointmentData={appointmentData} />
      ) : null}
    </aside>
  );
}
