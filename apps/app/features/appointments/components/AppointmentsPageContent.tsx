"use client";

import { Suspense, useState } from "react";
import { useMarkDoctorDelay } from "@workspace/data-access";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { FeatureGate } from "@/components/auth/feature-gate";
import { Feature } from "@/lib/stores/permission-store";
import { useAppointmentsLogic } from "@/features/appointments/hooks/use-appointments-logic";
import { useAppointmentsPageEffects } from "@/features/appointments/hooks/use-appointments-page-effects";
import { AppointmentsUpgradeFallback } from "./AppointmentsUpgradeFallback";
import { AppointmentsPageContentBody } from "./AppointmentsPageContentBody";

function AppointmentsContent() {
  const { state, handlers } = useAppointmentsLogic();
  const { appointmentRequestsRef, handleScheduleFollowUp } =
    useAppointmentsPageEffects();
  const [isDelayDialogOpen, setIsDelayDialogOpen] = useState(false);
  const { mutate: markDelay, isPending: isMarkingDelay } = useMarkDoctorDelay();

  return (
    <FeatureGate
      feature={Feature.CALENDAR_SLOTS}
      fallback={<AppointmentsUpgradeFallback />}
    >
      <AppointmentsPageContentBody
        state={state}
        handlers={handlers}
        handleScheduleFollowUp={handleScheduleFollowUp}
        appointmentRequestsRef={appointmentRequestsRef}
        isDelayDialogOpen={isDelayDialogOpen}
        setIsDelayDialogOpen={setIsDelayDialogOpen}
        isMarkingDelay={isMarkingDelay}
        onMarkDelay={(input) => {
          markDelay(input, { onSuccess: () => setIsDelayDialogOpen(false) });
        }}
      />
    </FeatureGate>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense
      fallback={
        <AppPageScaffold>
          <DataState
            status="loading"
            loadingMessage="Loading appointments…"
            className="min-h-[40vh]"
          />
        </AppPageScaffold>
      }
    >
      <AppointmentsContent />
    </Suspense>
  );
}
