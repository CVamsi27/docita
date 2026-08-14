import { Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { Feature } from "@workspace/types";
import { useMarkDoctorDelay } from "@workspace/data-access";
import { AppPageScaffold, DataState } from "@workspace/ui/components";
import { useTierFeatureEnabled } from "@/lib/access-control/use-tier-feature-enabled";
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
  const canViewCalendar = useTierFeatureEnabled(Feature.CALENDAR_SLOTS);

  if (!canViewCalendar) {
    return <AppointmentsUpgradeFallback />;
  }

  return (
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
  );
}

export default function AppointmentsPage() {
  const { t } = useTranslation("Appointments");
  return (
    <Suspense
      fallback={
        <AppPageScaffold>
          <DataState
            status="loading"
            loadingMessage={t("page.loading")}
            className="min-h-[40vh]"
          />
        </AppPageScaffold>
      }
    >
      <AppointmentsContent />
    </Suspense>
  );
}
