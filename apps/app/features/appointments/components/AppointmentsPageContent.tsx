"use client";

import dynamicImport from "next/dynamic";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Clock } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
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
import { useScrollBehavior } from "@workspace/hooks";
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
  const scrollBehavior = useScrollBehavior();

  useEffect(() => {
    if (focusRequestsPanel !== "1") return;
    const timer = window.setTimeout(() => {
      appointmentRequestsRef.current?.scrollIntoView({
        behavior: scrollBehavior,
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
  }, [focusRequestsPanel, router, searchParams, scrollBehavior]);

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
    selectedPickerIso,
    clinicTz,
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

    const breakdown: Array<{
      label: string;
      value: number;
      status: StatusType;
    }> = [
      { label: "Scheduled", value: counts.scheduled, status: "scheduled" },
      { label: "Confirmed", value: counts.confirmed, status: "confirmed" },
      { label: "Checked in", value: counts["checked-in"], status: "success" },
      { label: "In progress", value: counts["in-progress"], status: "in-progress" },
      { label: "Completed", value: counts.completed, status: "completed" },
    ];

    return { total: counts.total, breakdown: breakdown.filter((item) => item.value > 0) };
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
          searchRowAction={
            <Button
              variant="outline"
              size="sm"
              className="btn-warning"
              onClick={() => setIsDelayDialogOpen(true)}
            >
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              Mark Delay
            </Button>
          }
        />

        <DoctorDelayBanner filterDoctorId={selectedDoctorId ?? undefined} />

        {appointmentSummary.total > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border/60 bg-background/60 px-3 py-2 text-xs">
            <span className="font-semibold text-foreground">
              {appointmentSummary.total} appointment
              {appointmentSummary.total !== 1 ? "s" : ""}
            </span>
            {appointmentSummary.breakdown.length > 0 ? (
              <span className="hidden text-muted-foreground sm:inline" aria-hidden>
                ·
              </span>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {appointmentSummary.breakdown.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1.5 text-muted-foreground"
                >
                  <span
                    className={cn(
                      "inline-flex h-1.5 w-1.5 shrink-0 rounded-full",
                      getStatusColor(item.status),
                    )}
                    aria-hidden
                  />
                  <span>
                    {item.label}{" "}
                    <span className="font-medium tabular-nums text-foreground">
                      {item.value}
                    </span>
                  </span>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:gap-6 lg:grid-cols-[minmax(320px,360px)_minmax(0,1fr)]">
          <div className="order-2 lg:order-1">
          <AppointmentsCalendarUI
            selectedPickerIso={selectedPickerIso}
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
          </div>

          <div className="order-1 min-w-0 lg:order-2">
          <AppointmentsListUI
            selectedPickerIso={selectedPickerIso}
            clinicTz={clinicTz}
            canViewAllDoctors={canViewAllDoctors || false}
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
