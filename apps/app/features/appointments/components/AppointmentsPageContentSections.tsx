"use client";

import { DataState } from "@workspace/ui/components/data-display/data-state";
import {
  AppointmentsCalendarUI,
  AppointmentsListUI,
  AppointmentsWeekView,
} from "@/features/appointments/components";
import type { AppointmentListItem } from "@workspace/data-access";

// ---------------------------------------------------------------------------
// AppointmentsWeekViewSection
// ---------------------------------------------------------------------------

interface AppointmentsWeekViewSectionProps {
  monthRangeAppointments: AppointmentListItem[];
  selectedPickerIso: string;
  clinicTz: string;
  onSelectDay: (date: Date) => void;
  onOpenAppointment: (appointment: AppointmentListItem) => void;
  isError: boolean;
  onRetry: () => void;
}

export function AppointmentsWeekViewSection({
  monthRangeAppointments,
  selectedPickerIso,
  clinicTz,
  onSelectDay,
  onOpenAppointment,
  isError,
  onRetry,
}: AppointmentsWeekViewSectionProps) {
  if (isError) {
    return (
      <DataState
        status="error"
        className="min-h-[40vh]"
        errorMessage="We could not load this week's appointments. Please try again."
        onRetry={onRetry}
      />
    );
  }

  return (
    <AppointmentsWeekView
      appointments={monthRangeAppointments}
      selectedPickerIso={selectedPickerIso}
      clinicTz={clinicTz}
      onSelectDay={onSelectDay}
      onOpenAppointment={onOpenAppointment}
    />
  );
}

// ---------------------------------------------------------------------------
// AppointmentsDayViewSection
// ---------------------------------------------------------------------------

interface AppointmentsDayViewSectionProps {
  selectedPickerIso: string;
  date: Date;
  onDateSelect: (date: Date | undefined) => void;
  calendarMonth: Date;
  onCalendarMonthChange: (date: Date) => void;
  appointmentCountsByDay: Map<string, number>;
  canViewAllDoctors: boolean;
  doctorsList: { id: string; name: string; role: string }[];
  selectedDoctorId: string | undefined;
  onDoctorSelect: (doctorId: string | undefined) => void;
  clinicTz: string;
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
  filteredAppointments: AppointmentListItem[];
  hasMoreAppointments: boolean;
  isToday: boolean;
  currentTimeSlot: string;
  currentTimeSlotRef: React.RefObject<HTMLDivElement | null>;
  checkingIn: string | null;
  startingConsultationId: string | null;
  onCheckIn: (appointmentId: string) => void;
  onStartConsultation: (appointmentId: string) => Promise<void>;
  onCancelClick: (appointmentId: string) => void;
  onNoShowClick: (appointmentId: string) => void;
  onScheduleFollowUp: (appointment: AppointmentListItem) => void;
  currentUserId?: string;
}

export function AppointmentsDayViewSection({
  selectedPickerIso,
  date,
  onDateSelect,
  calendarMonth,
  onCalendarMonthChange,
  appointmentCountsByDay,
  canViewAllDoctors,
  doctorsList,
  selectedDoctorId,
  onDoctorSelect,
  clinicTz,
  loading,
  isError,
  onRetry,
  filteredAppointments,
  hasMoreAppointments,
  isToday,
  currentTimeSlot,
  currentTimeSlotRef,
  checkingIn,
  startingConsultationId,
  onCheckIn,
  onStartConsultation,
  onCancelClick,
  onNoShowClick,
  onScheduleFollowUp,
  currentUserId,
}: AppointmentsDayViewSectionProps) {
  return (
    <div className="grid gap-4 md:gap-6 lg:grid-cols-[minmax(320px,360px)_minmax(0,1fr)]">
      <div className="order-2 lg:order-1">
        <AppointmentsCalendarUI
          selectedPickerIso={selectedPickerIso}
          date={date}
          onDateSelect={onDateSelect}
          calendarMonth={calendarMonth}
          onCalendarMonthChange={onCalendarMonthChange}
          appointmentCountsByDay={appointmentCountsByDay}
          canViewAllDoctors={canViewAllDoctors}
          doctorsList={doctorsList}
          selectedDoctorId={selectedDoctorId}
          onDoctorSelect={onDoctorSelect}
        />
      </div>

      <div className="order-1 min-w-0 lg:order-2">
        <AppointmentsListUI
          selectedPickerIso={selectedPickerIso}
          clinicTz={clinicTz}
          canViewAllDoctors={canViewAllDoctors}
          loading={loading}
          isError={isError}
          onRetry={onRetry}
          doctorsList={doctorsList}
          selectedDoctorId={selectedDoctorId}
          filteredAppointments={filteredAppointments}
          hasMoreAppointments={hasMoreAppointments}
          isToday={isToday}
          currentTimeSlot={currentTimeSlot}
          currentTimeSlotRef={currentTimeSlotRef}
          checkingIn={checkingIn}
          startingConsultationId={startingConsultationId}
          onCheckIn={onCheckIn}
          onStartConsultation={onStartConsultation}
          onCancelClick={onCancelClick}
          onNoShowClick={onNoShowClick}
          onScheduleFollowUp={onScheduleFollowUp}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
