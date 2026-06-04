"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useClinicMembers,
  useCreateDoctorTimeOff,
  useDeleteDoctorTimeOffMutation,
  useDoctorTimeOffs,
} from "@workspace/data-access";
import { isAdmin, isDoctor } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "sonner";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  DoctorSelectorSection,
  TimeAwayFormFields,
  ScheduledTimeAwayList,
  TimeAwayHeader,
} from "./DoctorTimeAwaySettingsSections";

export function DoctorTimeAwaySettings() {
  const { user } = useAuth();
  const { data: members = [] } = useClinicMembers();

  const doctors = useMemo(
    () => members.filter((m) => isDoctor(m.role)),
    [members],
  );

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("me");

  useEffect(() => {
    if (isAdmin(user?.role) && doctors.length > 0 && selectedDoctorId === "me") {
      setSelectedDoctorId(doctors[0]?.id ?? "me");
    }
  }, [user?.role, doctors, selectedDoctorId]);

  const queryDoctorId =
    isAdmin(user?.role) && selectedDoctorId !== "me"
      ? selectedDoctorId
      : undefined;

  const { data: timeOffs = [], isLoading } = useDoctorTimeOffs(
    queryDoctorId,
    false,
  );

  const createMutation = useCreateDoctorTimeOff();
  const deleteMutation = useDeleteDoctorTimeOffMutation();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isFullDay, setIsFullDay] = useState(true);
  const [partialStart, setPartialStart] = useState("09:00");
  const [partialEnd, setPartialEnd] = useState("17:00");

  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setReason("");
    setIsFullDay(true);
    setPartialStart("09:00");
    setPartialEnd("17:00");
  };

  const handleCreate = async () => {
    if (!startDate.trim() || !endDate.trim()) {
      showUserFacingErrorToast(
        null,
        "Choose a start date and end date for time away.",
        "form",
      );
      return;
    }
    if (!isFullDay && (!partialStart.trim() || !partialEnd.trim())) {
      showUserFacingErrorToast(
        null,
        "Partial days require start and end times.",
        "form",
      );
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...(isAdmin(user?.role) && selectedDoctorId !== "me"
          ? { doctorId: selectedDoctorId }
          : {}),
        startDate,
        endDate,
        reason: reason.trim() || undefined,
        isFullDay,
        ...(!isFullDay ? { startTime: partialStart, endTime: partialEnd } : {}),
      });
      toast.success("Time away saved");
      resetForm();
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not save this time away. Please try again.",
        "save",
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Time away removed");
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not remove this entry. Please try again.",
        "save",
      );
    }
  };

  const upcomingSorted = useMemo(() => {
    const now = Date.now();
    return [...timeOffs].sort((a, b) => {
      const ta = new Date(a.endDate).getTime();
      const tb = new Date(b.endDate).getTime();
      if (ta >= now && tb >= now) return ta - tb;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
  }, [timeOffs]);

  return (
    <Card>
      <TimeAwayHeader />
      <CardContent className="flex flex-col gap-6 pt-5">
        {isAdmin(user?.role) && doctors.length > 0 ? (
          <DoctorSelectorSection
            doctors={doctors}
            selectedDoctorId={selectedDoctorId}
            onDoctorChange={setSelectedDoctorId}
          />
        ) : null}

        <TimeAwayFormFields
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          reason={reason}
          onReasonChange={setReason}
          isFullDay={isFullDay}
          onIsFullDayChange={setIsFullDay}
          partialStart={partialStart}
          onPartialStartChange={setPartialStart}
          partialEnd={partialEnd}
          onPartialEndChange={setPartialEnd}
        />

        <Button
          type="button"
          onClick={() => void handleCreate()}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <>
              <DocitaLoadingIndicator
                variant="inline"
                decorative
                className="mr-2"
              />
              Saving
            </>
          ) : (
            "Add time away"
          )}
        </Button>

        <ScheduledTimeAwayList
          timeOffs={upcomingSorted}
          isLoading={isLoading}
          currentUserId={user?.id}
          userRole={user?.role}
          isAdminCheck={isAdmin}
          onDelete={handleDelete}
          isDeleting={deleteMutation.isPending}
        />
      </CardContent>
    </Card>
  );
}
