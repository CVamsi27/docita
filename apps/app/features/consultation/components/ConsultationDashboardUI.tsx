"use client";

import { FC, useCallback, useMemo, useState } from "react";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { Button } from "@workspace/ui/components/form/button";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Activity, Calendar, Stethoscope, Users } from "lucide-react";
import { useConsultationDashboard } from "@/features/consultation/hooks/use-consultation-dashboard";
import { StatGrid } from "@workspace/ui/components/data-display/stat-grid";
import Link from "next/link";
import { useCheckInAppointment } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import type { Appointment } from "@workspace/types";
import {
  AddAppointmentDialogContainer,
  AppointmentRowActionDialogs,
  useAppointmentRowActions,
} from "@/features/appointments";
import { usePermissions } from "@/hooks/use-permissions";
import { ConsultationDashboardSkeleton } from "./ConsultationDashboardSkeleton";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import {
  DoctorNextSection,
  NursePrepSection,
} from "./ConsultationDashboardSections";

export const ConsultationDashboardUI: FC = () => {
  const {
    opdQueueRows,
    stats,
    isLoading,
    handleStartConsultation,
    goToConsultationWorkspace,
    isStartingConsultation,
    router,
    currentUserRole,
    doctorNowNext,
    clinicType,
  } = useConsultationDashboard();

  const checkInAppointment = useCheckInAppointment();
  const { canCreateAppointment } = usePermissions();
  const [walkInOpen, setWalkInOpen] = useState(false);

  const rowActions = useAppointmentRowActions();
  const handleScheduleFollowUp = useCallback(
    (patientId?: string | null) => {
      const params = new URLSearchParams();
      params.set("action", "new");
      if (patientId) {
        params.set("patientId", patientId);
      }
      router.push(`/appointments?${params.toString()}`);
    },
    [router],
  );

  const role = currentUserRole ?? "RECEPTIONIST";
  const isDoctor = role === "DOCTOR" || role === "ADMIN_DOCTOR";
  const isReception =
    role === "RECEPTIONIST" || role === "ADMIN" || role === "ADMIN_DOCTOR";
  const isNurse = role === "NURSE";
  const canCreateWalkIn = canCreateAppointment && (isReception || isNurse);

  const statItems = useMemo(
    () => [
      {
        id: "scheduled",
        label: "Scheduled Today",
        value: stats.scheduledToday,
        icon: <Calendar className="h-4 w-4" aria-hidden />,
      },
      {
        id: "waiting",
        label: "Waiting",
        value: stats.waiting,
        icon: <Users className="h-4 w-4" aria-hidden />,
      },
      {
        id: "active",
        label: "Active",
        value: stats.inProgress,
        icon: <Activity className="h-4 w-4" aria-hidden />,
      },
      {
        id: "completed",
        label: "Completed",
        value: stats.completed,
        icon: <Stethoscope className="h-4 w-4" aria-hidden />,
      },
    ],
    [stats],
  );

  if (isLoading) return <ConsultationDashboardSkeleton />;

  return (
    <FeatureGate feature={Feature.CALENDAR_SLOTS} showLockedCard>
    <AppPageScaffold
      header={
        <PageHeader
          title="Consultation"
          description="Continue your current visit, open the next patient, or add a walk-in for today."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild size="sm">
                <Link href="/today">Today</Link>
              </Button>
              {canCreateWalkIn ? (
                <Button size="sm" onClick={() => setWalkInOpen(true)}>
                  Add walk-in
                </Button>
              ) : null}
              <Button size="sm" onClick={() => router.push("/appointments")}>
                <Calendar className="mr-2 h-4 w-4" />
                Appointments
              </Button>
            </div>
          }
        />
      }
    >
      <StatGrid items={statItems} columns={4} />

      {isDoctor ? (
        <DoctorNextSection
          doctorNowNext={doctorNowNext}
          isStartingConsultation={isStartingConsultation}
          rowActions={rowActions}
          handleScheduleFollowUp={handleScheduleFollowUp}
          handleStartConsultation={handleStartConsultation}
          goToConsultationWorkspace={goToConsultationWorkspace}
        />
      ) : null}



      {canCreateWalkIn ? (
        <AddAppointmentDialogContainer
          open={walkInOpen}
          onOpenChange={setWalkInOpen}
          selectedDate={new Date()}
          mode="walk-in"
          onAppointmentAdded={async (appointment: Appointment) => {
            try {
              if (!appointment.id) {
                showUserFacingErrorToast(
                  "Missing appointment id.",
                  "Appointment created, but we could not check-in the patient. Please refresh and try again from Appointments.",
                  "save",
                );
                return;
              }
              await checkInAppointment.mutateAsync(appointment.id);
            } catch (err) {
              showUserFacingErrorToast(
                err,
                "Appointment created, but we could not check-in the patient. You can check them in from Appointments.",
                "save",
              );
            }
          }}
        />
      ) : null}

      <AppointmentRowActionDialogs {...rowActions.dialogProps} />

      {isNurse ? (
        <NursePrepSection
          opdQueueRows={opdQueueRows}
          rowActions={rowActions}
          clinicType={clinicType}
          router={router}
          handleScheduleFollowUp={handleScheduleFollowUp}
        />
      ) : null}


    </AppPageScaffold>
    </FeatureGate>
  );
};
