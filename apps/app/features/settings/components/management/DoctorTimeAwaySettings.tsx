"use client";

import { isAdmin } from "@/lib/auth/permissions";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { useDoctorTimeAwaySettings } from "./use-doctor-time-away-settings";
import { AddTimeAwayButton, DoctorSelectorSection, TimeAwayFormFields, ScheduledTimeAwayList, TimeAwayHeader } from "./DoctorTimeAwaySettingsSections";

export function DoctorTimeAwaySettings() {
  const { selection, form, list } = useDoctorTimeAwaySettings();

  return (
    <Card>
      <TimeAwayHeader />
      <CardContent className="flex flex-col gap-6 pt-5">
        {selection.isAdminUser && selection.doctors.length > 0 ? (
          <DoctorSelectorSection
            doctors={selection.doctors}
            selectedDoctorId={selection.selectedDoctorId}
            onDoctorChange={selection.setSelectedDoctorId}
          />
        ) : null}

        <TimeAwayFormFields
          startDate={form.startDate}
          onStartDateChange={form.setStartDate}
          endDate={form.endDate}
          onEndDateChange={form.setEndDate}
          reason={form.reason}
          onReasonChange={form.setReason}
          isFullDay={form.isFullDay}
          onIsFullDayChange={form.setIsFullDay}
          partialStart={form.partialStart}
          onPartialStartChange={form.setPartialStart}
          partialEnd={form.partialEnd}
          onPartialEndChange={form.setPartialEnd}
        />

        <AddTimeAwayButton
          isCreating={form.isCreating}
          onClick={() => void form.handleCreate()}
        />

        <ScheduledTimeAwayList
          timeOffs={list.upcomingSorted}
          isLoading={list.isLoading}
          currentUserId={selection.user?.id}
          userRole={selection.user?.role}
          isAdminCheck={isAdmin}
          onDelete={list.handleDelete}
          isDeleting={list.isDeleting}
        />
      </CardContent>
    </Card>
  );
}
