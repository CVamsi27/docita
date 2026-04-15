"use client";

import { Suspense } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { ConfirmationDialog } from "@workspace/ui/components/confirmation-dialog";
import { LoadingState } from "@workspace/ui/components/empty-state";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import { Feature } from "@/lib/stores/permission-store";

import { useAppointmentsLogic } from "@/features/appointments/hooks/use-appointments-logic";
import {
  AppointmentsCalendarUI,
  AppointmentsListUI,
  AppointmentsPageHeaderUI,
  CancelAppointmentDialog,
} from "@/features/appointments/components";

export const dynamic = "force-dynamic";

function AppointmentsContent() {
  const { state, handlers } = useAppointmentsLogic();

  const {
    date,
    setDate,
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
    activeStartHour,
    activeEndHour,
  } = state;

  const {
    handleCheckIn,
    handleStartConsultation,
    handleCancelAppointment,
    handleNoShowAppointment,
    setCancellingAptId,
    setNoShowAptId,
    refetch,
  } = handlers;

  return (
    <FeatureGate
      feature={Feature.CALENDAR_SLOTS}
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
          <CalendarDays className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">
            Appointment Scheduling
          </h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            Manage patient appointments with an intuitive calendar. Upgrade to
            Core tier to unlock this feature.
          </p>
          <Button asChild>
            <Link href="/settings?tab=subscription">Upgrade to Core</Link>
          </Button>
        </div>
      }
    >
      <AppPageScaffold>
        <AppointmentsPageHeaderUI
          onAppointmentAdded={() => refetch()}
          selectedDate={date}
          isAddDialogOpen={isAddDialogOpen}
          onOpenChange={handleDialogChange}
          preselectedPatientId={preselectedPatientId}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <div className="grid gap-6 md:grid-cols-[300px_1fr]">
          <AppointmentsCalendarUI
            date={date}
            onDateSelect={setDate}
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
            currentUserId={user?.id}
            activeStartHour={activeStartHour}
            activeEndHour={activeEndHour}
          />
        </div>
      </AppPageScaffold>

      <CancelAppointmentDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        isLoading={isPendingMutation}
        onConfirm={handleCancelAppointment}
      />

      {/* No-show remains a simple confirmation */}
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
      fallback={<LoadingState message="Loading appointments..." className="py-16" />}
    >
      <AppointmentsContent />
    </Suspense>
  );
}
