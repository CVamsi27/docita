"use client";

import dynamicImport from "next/dynamic";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Clock } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { cn } from "@workspace/ui/lib/utils";
import { getStatusColor } from "@workspace/ui/components/indicators/status-badge";
import type { StatusType } from "@workspace/ui/components/indicators/status-badge";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { FeatureGate } from "@/components/auth/feature-gate";
import { Feature } from "@/lib/stores/permission-store";

import { useAppointmentsLogic } from "@/features/appointments/hooks/use-appointments-logic";
import {
  AppointmentRowActionDialogs,
  AppointmentsCalendarUI,
  AppointmentsListUI,
  AppointmentsPageHeaderUI,
} from "@/features/appointments/components";
import { DoctorDelayBanner } from "@/features/appointments/components/DoctorDelayBanner";
import { MarkDoctorDelayDialog } from "@/features/appointments/components/dialogs/MarkDoctorDelayDialog";
import { useMarkDoctorDelay } from "@workspace/data-access";
import type { AppointmentListItem } from "@workspace/data-access";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";

const REQUESTS_PANEL_FOCUS_PARAM = "requestsPanel";

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
  const [isDelayDialogOpen, setIsDelayDialogOpen] = useState(false);
  const { mutate: markDelay, isPending: isMarkingDelay } = useMarkDoctorDelay();
  const appointmentRequestsRef = useRef<HTMLDivElement>(null);
  const focusRequestsPanel = searchParams.get(REQUESTS_PANEL_FOCUS_PARAM);

  useEffect(() => {
    if (focusRequestsPanel !== "1") return;
    const timer = window.setTimeout(() => {
      appointmentRequestsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      const next = new URLSearchParams(searchParams.toString());
      next.delete(REQUESTS_PANEL_FOCUS_PARAM);
      const qs = next.toString();
      router.replace(qs.length > 0 ? `/appointments?${qs}` : "/appointments", {
        scroll: false,
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [focusRequestsPanel, router, searchParams]);

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
    rowActionDialogProps,
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
  } = state;

  const {
    handleCheckIn,
    handleAppointmentAdded,
    handleStartConsultation,
    onCancelClick,
    onNoShowClick,
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
          onAdjustSchedulingDate={setDate}
          isAddDialogOpen={isAddDialogOpen}
          onOpenChange={handleDialogChange}
          preselectedPatientId={preselectedPatientId}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <DoctorDelayBanner filterDoctorId={selectedDoctorId ?? undefined} />
          <Button
            variant="outline"
            size="sm"
            className="btn-warning ml-auto shrink-0"
            onClick={() => setIsDelayDialogOpen(true)}
          >
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            Mark Delay
          </Button>
        </div>

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
            onCancelClick={onCancelClick}
            onNoShowClick={onNoShowClick}
            onScheduleFollowUp={handleScheduleFollowUp}
            currentUserId={user?.id}
          />
        </div>

        <div
          ref={appointmentRequestsRef}
          id="appointment-requests-panel"
          className="scroll-mt-6"
        >
          <AppointmentRequestsPanel />
        </div>
      </AppPageScaffold>

      <AppointmentRowActionDialogs {...rowActionDialogProps} />

      <MarkDoctorDelayDialog
        open={isDelayDialogOpen}
        onOpenChange={setIsDelayDialogOpen}
        doctorId={selectedDoctorId ?? undefined}
        doctorName={
          selectedDoctorId
            ? (doctorsList?.find((d) => d.id === selectedDoctorId)?.name ?? "")
            : undefined
        }
        doctors={
          !selectedDoctorId && doctorsList
            ? doctorsList.map((d) => ({ id: d.id, name: d.name }))
            : undefined
        }
        isLoading={isMarkingDelay}
        onConfirm={(input) => {
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
