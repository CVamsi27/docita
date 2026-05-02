"use client";

import dynamicImport from "next/dynamic";
import { Suspense, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import { getStatusColor } from "@workspace/ui/components/status-badge";
import type { StatusType } from "@workspace/ui/components/status-badge";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { DataState } from "@workspace/ui/components/data-state";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import { Feature } from "@/lib/stores/permission-store";

import { useAppointmentsLogic } from "@/features/appointments/hooks/use-appointments-logic";
import {
  AppointmentsCalendarUI,
  AppointmentsListUI,
  AppointmentsPageHeaderUI,
} from "@/features/appointments/components";
import type { AppointmentListItem } from "@/hooks/api/use-appointments";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription-settings-path";

const CancelAppointmentDialog = dynamicImport(
  () =>
    import(
      "@/features/appointments/components/dialogs/CancelAppointmentDialog"
    ).then((m) => ({ default: m.CancelAppointmentDialog })),
  { ssr: false },
);

const ConfirmationDialog = dynamicImport(
  () =>
    import("@workspace/ui/components/confirmation-dialog").then((m) => ({
      default: m.ConfirmationDialog,
    })),
  { ssr: false },
);

const AppointmentRequestsPanel = dynamicImport(
  () =>
    import(
      "@/features/appointments/components/sections/AppointmentRequestsPanel"
    ).then((m) => ({ default: m.AppointmentRequestsPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="mt-6 h-24 rounded-lg border border-border/40 bg-muted/30" />
    ),
  },
);

function AppointmentsContent() {
  const { state, handlers } = useAppointmentsLogic();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleScheduleFollowUp = useCallback(
    (appointment: AppointmentListItem) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("action", "new");
      if (appointment.patientId) {
        params.set("patientId", appointment.patientId);
      }
      router.replace(`/appointments?${params.toString()}`);
    },
    [router, searchParams],
  );

  const {
    date,
    setDate,
    calendarMonth,
    onCalendarMonthChange,
    appointmentCountsByDay,
    checkingIn,
    cancelDialogOpen,
    setCancelDialogOpen,
    noShowDialogOpen,
    setNoShowDialogOpen,
    isAddDialogOpen,
    handleDialogChange,
    selectedDoctorId,
    setSelectedDoctorId,
    searchQuery,
    setSearchQuery,
    canViewAllDoctors,
    doctorsList,
    loading,
    isError,
    hasMoreAppointments,
    filteredAppointments,
    currentTimeSlot,
    isToday,
    currentTimeSlotRef,
    preselectedPatientId,
    startingConsultationId,
    user,
    isPendingMutation,
  } = state;

  const {
    handleCheckIn,
    handleAppointmentAdded,
    handleStartConsultation,
    handleCancelAppointment,
    handleNoShowAppointment,
    setCancellingAptId,
    setNoShowAptId,
    refetch,
  } = handlers;

  const appointmentSummary = useMemo(() => {
    const counts = filteredAppointments.reduce(
      (acc, appointment) => {
        acc.total += 1;
        acc[appointment.status] = (acc[appointment.status] ?? 0) + 1;
        return acc;
      },
      {
        total: 0,
        scheduled: 0,
        confirmed: 0,
        "checked-in": 0,
        "in-progress": 0,
        completed: 0,
      } as Record<string, number>,
    );

    return [
      { label: "Total", value: counts.total, status: "info" as StatusType },
      { label: "Scheduled", value: counts.scheduled, status: "scheduled" },
      { label: "Confirmed", value: counts.confirmed, status: "confirmed" },
      { label: "Checked in", value: counts["checked-in"], status: "success" },
      { label: "In progress", value: counts["in-progress"], status: "in-progress" },
      { label: "Completed", value: counts.completed, status: "completed" },
    ];
  }, [filteredAppointments]);

  return (
    <FeatureGate
      feature={Feature.CALENDAR_SLOTS}
      fallback={
        <AppPageScaffold>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-card/50 p-8 text-center min-h-[50vh]">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border/70 bg-background/70">
              <CalendarDays className="h-7 w-7 text-primary" />
            </div>
            <h2 className="ui-section-title mb-2">Appointment Scheduling</h2>
            <p className="ui-page-subtitle mb-5 max-w-md">
              Manage patient appointments with an intuitive calendar. Upgrade
              to Core tier to unlock this feature.
            </p>
            <Button asChild>
              <Link href={SUBSCRIPTION_SETTINGS_PATH}>Upgrade to Core</Link>
            </Button>
          </div>
        </AppPageScaffold>
      }
    >
      <AppPageScaffold>
        <AppointmentsPageHeaderUI
          onAppointmentAdded={handleAppointmentAdded}
          selectedDate={date}
          isAddDialogOpen={isAddDialogOpen}
          onOpenChange={handleDialogChange}
          preselectedPatientId={preselectedPatientId}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <div className="flex flex-wrap gap-2">
          {appointmentSummary.map((item) => (
            <div
              key={item.label}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-sm"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </span>
              <Badge
                variant="secondary"
                className={cn(
                  "rounded-full border-0 px-2 py-0 text-xs font-medium",
                  getStatusColor(item.status),
                )}
              >
                {item.value}
              </Badge>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:gap-6 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)]">
          <AppointmentsCalendarUI
            date={date}
            onDateSelect={setDate}
            calendarMonth={calendarMonth}
            onCalendarMonthChange={onCalendarMonthChange}
            appointmentCountsByDay={appointmentCountsByDay}
            canViewAllDoctors={canViewAllDoctors || false}
            doctorsList={doctorsList}
            selectedDoctorId={selectedDoctorId}
            onDoctorSelect={setSelectedDoctorId}
          />

          <AppointmentsListUI
            date={date}
            loading={loading}
            isError={isError}
            onRetry={refetch}
            doctorsList={doctorsList}
            selectedDoctorId={selectedDoctorId}
            filteredAppointments={filteredAppointments}
            hasMoreAppointments={hasMoreAppointments}
            isToday={isToday}
            currentTimeSlot={currentTimeSlot}
            currentTimeSlotRef={currentTimeSlotRef}
            checkingIn={checkingIn}
            startingConsultationId={startingConsultationId}
            onCheckIn={handleCheckIn}
            onStartConsultation={handleStartConsultation}
            onCancelClick={(id) => {
              setCancellingAptId(id);
              setCancelDialogOpen(true);
            }}
            onNoShowClick={(id) => {
              setNoShowAptId(id);
              setNoShowDialogOpen(true);
            }}
            onScheduleFollowUp={handleScheduleFollowUp}
            currentUserId={user?.id}
          />
        </div>

        <AppointmentRequestsPanel />
      </AppPageScaffold>

      <CancelAppointmentDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        isLoading={isPendingMutation}
        onConfirm={handleCancelAppointment}
      />
      <ConfirmationDialog
        open={noShowDialogOpen}
        onOpenChange={setNoShowDialogOpen}
        title="Mark as No Show"
        description="Are you sure you want to mark this appointment as no-show?"
        confirmText="Mark as No Show"
        cancelText="Cancel"
        type="danger"
        isLoading={isPendingMutation}
        onConfirm={handleNoShowAppointment}
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
