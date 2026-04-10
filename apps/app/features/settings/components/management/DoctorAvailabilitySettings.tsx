"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useBulkDoctorSchedules,
  useClinicMembers,
  useDoctorSchedules,
} from "@/hooks/api/use-settings";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Switch } from "@workspace/ui/components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Calendar, Loader2 } from "lucide-react";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

interface DaySchedule {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
}

const DEFAULT_DAY_SCHEDULE: Omit<DaySchedule, "dayOfWeek"> = {
  startTime: "09:00",
  endTime: "17:00",
  slotDuration: 15,
  isActive: false,
};

const WEEKEND_DEFAULT: Partial<Omit<DaySchedule, "dayOfWeek">> = {
  isActive: false,
};

export function DoctorAvailabilitySettings() {
  const { user, isAdmin } = useAuth();
  const { data: members = [] } = useClinicMembers();

  const doctors = useMemo(
    () =>
      members.filter(
        (m) => m.role === "DOCTOR" || m.role === "ADMIN_DOCTOR",
      ),
    [members],
  );

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("me");

  useEffect(() => {
    if (isAdmin && doctors.length > 0 && selectedDoctorId === "me") {
      setSelectedDoctorId(doctors[0]?.id ?? "me");
    }
  }, [isAdmin, doctors, selectedDoctorId]);

  const targetDoctorId = isAdmin ? selectedDoctorId : "me";

  const { data: schedules, isLoading } = useDoctorSchedules(targetDoctorId);
  const { mutate: bulkSave, isPending: isSaving } = useBulkDoctorSchedules();

  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>(() =>
    DAYS_OF_WEEK.map((day) => ({
      dayOfWeek: day,
      ...(day === "Saturday" || day === "Sunday"
        ? { ...DEFAULT_DAY_SCHEDULE, ...WEEKEND_DEFAULT }
        : DEFAULT_DAY_SCHEDULE),
    })),
  );

  useEffect(() => {
    const populated = DAYS_OF_WEEK.map((day) => {
      const existing = schedules?.find((s) => s.dayOfWeek === day);
      if (existing) {
        return {
          dayOfWeek: day,
          startTime: existing.startTime,
          endTime: existing.endTime,
          slotDuration: existing.slotDuration,
          isActive: existing.isActive,
        };
      }
      return {
        dayOfWeek: day,
        ...(day === "Saturday" || day === "Sunday"
          ? { ...DEFAULT_DAY_SCHEDULE, ...WEEKEND_DEFAULT }
          : DEFAULT_DAY_SCHEDULE),
      };
    });
    setDaySchedules(populated);
  }, [schedules]);

  const updateDay = (day: DayOfWeek, patch: Partial<Omit<DaySchedule, "dayOfWeek">>) => {
    setDaySchedules((prev) =>
      prev.map((d) => (d.dayOfWeek === day ? { ...d, ...patch } : d)),
    );
  };

  const handleSave = () => {
    const payload = daySchedules.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      startTime: d.startTime,
      endTime: d.endTime,
      slotDuration: d.slotDuration,
      isActive: d.isActive,
    }));

    const mutationBody =
      isAdmin && selectedDoctorId !== "me"
        ? { doctorId: selectedDoctorId, schedules: payload }
        : { schedules: payload };

    bulkSave(mutationBody, {
      onSuccess: () => {
        toast.success("Availability updated successfully");
      },
      onError: (err) => {
        showUserFacingErrorToast(
          err,
          "We could not update availability. Please try again.",
          "save",
        );
      },
    });
  };

  const selectedDoctorName = useMemo(() => {
    if (!isAdmin || selectedDoctorId === "me") return user?.name || "My";
    return doctors.find((d) => d.id === selectedDoctorId)?.name || "Doctor";
  }, [isAdmin, selectedDoctorId, doctors, user?.name]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card >
        <CardHeader>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-info" />
            <div>
              <CardTitle>Doctor Availability</CardTitle>
              <CardDescription>
                Configure working hours and slot duration per doctor
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isAdmin && doctors.length > 0 && (
            <div className="space-y-2">
              <Label>Select Doctor</Label>
              <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name}
                      {doctor.specialization && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({doctor.specialization})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-sm font-medium">
              {selectedDoctorName}&apos;s Weekly Schedule
            </p>
            <p className="text-xs text-muted-foreground">
              Toggle days on/off and set hours individually
            </p>
          </div>

          <div className="space-y-3">
            {daySchedules.map((day) => (
              <div
                key={day.dayOfWeek}
                className="flex flex-col sm:grid sm:grid-cols-[120px_1fr] gap-3 sm:gap-4 items-start rounded-lg border p-3"
              >
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    checked={day.isActive}
                    onCheckedChange={(val) =>
                      updateDay(day.dayOfWeek, { isActive: val })
                    }
                    id={`toggle-${day.dayOfWeek}`}
                  />
                  <Label
                    htmlFor={`toggle-${day.dayOfWeek}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {day.dayOfWeek.slice(0, 3)}
                  </Label>
                </div>

                <div
                  className={
                    day.isActive
                      ? "grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3"
                      : "grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3 opacity-40 pointer-events-none"
                  }
                >
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Start</Label>
                    <Input
                      type="time"
                      value={day.startTime}
                      onChange={(e) =>
                        updateDay(day.dayOfWeek, { startTime: e.target.value })
                      }
                      disabled={!day.isActive}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">End</Label>
                    <Input
                      type="time"
                      value={day.endTime}
                      onChange={(e) =>
                        updateDay(day.dayOfWeek, { endTime: e.target.value })
                      }
                      disabled={!day.isActive}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Slot (min)</Label>
                    <Input
                      type="number"
                      value={day.slotDuration}
                      onChange={(e) =>
                        updateDay(day.dayOfWeek, {
                          slotDuration: Number(e.target.value),
                        })
                      }
                      min={5}
                      max={60}
                      step={5}
                      disabled={!day.isActive}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button className="w-full" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Availability"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
