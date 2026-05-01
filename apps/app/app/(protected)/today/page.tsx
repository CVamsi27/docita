"use client";

import Link from "next/link";
import {
  DashboardAlertsContainer,
  DashboardQuickActionsContainer,
  DashboardSkeletonUI,
  DoctorDashboardCards,
  TodayScheduleUI,
} from "@/features/dashboard/components";
import { useDashboardLogic } from "@/features/dashboard/hooks/use-dashboard-logic";
import { Feature } from "@/lib/stores/permission-store";
import { useClinic } from "@/lib/clinic-context";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { Button } from "@workspace/ui/components/button";
import { DataState } from "@workspace/ui/components/data-state";
import { PageHeader } from "@workspace/ui/components/page-header";
import { LayoutDashboard } from "lucide-react";

export default function TodayPage() {
  const { clinic } = useClinic();
  const { state } = useDashboardLogic();
  const {
    stats,
    todayAppointments,
    completedToday,
    inProgressToday,
    currentPatient,
    nextPatients,
    waitingCount,
    pendingJoinRequests,
    isLoading,
    isError,
    refetch,
    canAccess,
  } = state;

  const header = (
    <PageHeader
      title="Today"
      description="Your queue, today's visits, and shortcuts in one place."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">Full dashboard</Link>
        </Button>
      }
    />
  );

  if (isLoading) {
    return (
      <AppPageScaffold header={header}>
        <DashboardSkeletonUI />
      </AppPageScaffold>
    );
  }

  if (isError) {
    return (
      <AppPageScaffold header={header}>
        <DataState
          status="error"
          className="min-h-[50vh]"
          errorMessage="We could not load today's workspace. Please try again."
          onRetry={refetch}
        />
      </AppPageScaffold>
    );
  }

  const isNewClinic =
    stats.totalPatients === 0 &&
    stats.todayAppointments === 0 &&
    stats.activePrescriptions === 0;

  if (isNewClinic) {
    return (
      <AppPageScaffold header={header}>
        <DataState
          status="empty"
          className="min-h-[50vh]"
          emptyIcon={LayoutDashboard}
          emptyTitle="Start with your first patient"
          emptyDescription="Add a patient or schedule a visit to see your queue and today's appointments here."
          emptyAction={{ label: "Go to patients", href: "/patients" }}
        />
      </AppPageScaffold>
    );
  }

  const alerts = (
    <DashboardAlertsContainer
      todayAppointments={todayAppointments.length}
      completedAppointments={completedToday}
      pendingReports={stats.pendingReports}
      pendingJoinRequests={pendingJoinRequests}
      patientsWaiting={waitingCount}
      nextPatientName={
        currentPatient?.patient
          ? `${currentPatient.patient.firstName} ${currentPatient.patient.lastName}`
          : undefined
      }
      nextPatientId={currentPatient?.id}
      className="mb-4"
    />
  );

  return (
    <AppPageScaffold header={header}>
      <div className="space-y-4 sm:space-y-6">
        {alerts}
        <DoctorDashboardCards
          currentPatient={currentPatient}
          nextPatients={nextPatients}
          queueStats={{
            waiting: waitingCount,
            inProgress: inProgressToday,
            completed: completedToday,
            total: todayAppointments.length,
          }}
          estimatedWaitTime={waitingCount * (clinic?.slotDuration ?? 15)}
        />
        <DashboardQuickActionsContainer pendingReports={stats.pendingReports} />
        {canAccess(Feature.CALENDAR_SLOTS) ? (
          <TodayScheduleUI appointments={todayAppointments} />
        ) : null}
      </div>
    </AppPageScaffold>
  );
}
