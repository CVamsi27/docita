import { lazy, Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { Clock } from "lucide-react";
import { AppPageScaffold, Button } from "@workspace/ui/components";
import { MarkDoctorDelaySection } from "./MarkDoctorDelaySection";
import { AppointmentRowActionDialogs } from "./dialogs/AppointmentRowActionDialogs";
import { AppointmentsPageHeaderUI } from "./header/AppointmentsPageHeaderUI";
import {
  AppointmentsWeekViewSection,
  AppointmentsDayViewSection,
} from "./AppointmentsPageContentSections";
import { AppointmentSummaryBar } from "@/features/appointments/components/AppointmentSummaryBar";
import { CalendarViewToggle } from "@/features/appointments/components/CalendarViewToggle";
import { DoctorDelayBanner } from "@/features/appointments/components/DoctorDelayBanner";
import { computeAppointmentSummary } from "@/features/appointments/lib/appointments-page-helpers";
import type { AppointmentsPageContentBodyProps } from "./appointments-page-content-body.types";

const AppointmentRequestsPanel = lazy(() =>
  import("@/features/appointments/components/sections/AppointmentRequestsPanel").then(
    (m) => ({ default: m.AppointmentRequestsPanel }),
  ),
);

export function AppointmentsPageContentBody({
  state,
  handlers,
  handleScheduleFollowUp,
  appointmentRequestsRef,
  isDelayDialogOpen,
  setIsDelayDialogOpen,
  isMarkingDelay,
  onMarkDelay,
}: AppointmentsPageContentBodyProps) {
  const { t } = useTranslation("Appointments");
  const [searchParams] = useSearchParams();
  const isV2Design = searchParams.get("design") === "v2";
  const [calendarView, setCalendarView] = useState<"day" | "week">(
    isV2Design ? "week" : "day",
  );
  const {
    date,
    selectedPickerIso,
    clinicTz,
    setDate,
    calendarMonth,
    onCalendarMonthChange,
    appointmentCountsByDay,
    monthRangeAppointments,
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
  const appointmentSummary = useMemo(
    () => computeAppointmentSummary(filteredAppointments),
    [filteredAppointments],
  );

  return (
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
            variant="warning"
            size="sm"
            onClick={() => setIsDelayDialogOpen(true)}
          >
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            {t("page.markDelay")}
          </Button>
        }
      />
      <DoctorDelayBanner filterDoctorId={selectedDoctorId ?? undefined} />
      <AppointmentSummaryBar summary={appointmentSummary} />
      {isV2Design ? (
        <CalendarViewToggle view={calendarView} onChange={setCalendarView} />
      ) : null}
      {isV2Design && calendarView === "week" ? (
        <AppointmentsWeekViewSection
          monthRangeAppointments={monthRangeAppointments}
          selectedPickerIso={selectedPickerIso}
          clinicTz={clinicTz}
          onSelectDay={setDate}
          onOpenAppointment={(a) => {
            setDate(new Date(a.startTime));
            setCalendarView("day");
          }}
          isError={isError}
          onRetry={refetch}
        />
      ) : (
        <AppointmentsDayViewSection
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
          clinicTz={clinicTz}
          loading={loading}
          isError={isError}
          onRetry={refetch}
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
          monthRangeAppointments={monthRangeAppointments}
        />
      )}
      <div
        ref={appointmentRequestsRef}
        id="appointment-requests-panel"
        className="scroll-mt-6"
      >
        <Suspense
          fallback={
            <div className="mt-6 h-24 rounded-lg border border-border/40 bg-muted/30" />
          }
        >
          <AppointmentRequestsPanel />
        </Suspense>
      </div>
      <AppointmentRowActionDialogs {...rowActionDialogProps} />
      <MarkDoctorDelaySection
        open={isDelayDialogOpen}
        onOpenChange={setIsDelayDialogOpen}
        selectedDoctorId={selectedDoctorId ?? undefined}
        doctorsList={doctorsList}
        isMarkingDelay={isMarkingDelay}
        onConfirm={onMarkDelay}
      />
    </AppPageScaffold>
  );
}
