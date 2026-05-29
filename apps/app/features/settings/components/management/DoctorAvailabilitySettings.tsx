"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Label } from "@workspace/ui/components/form/label";
import { Button } from "@workspace/ui/components/form/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Calendar } from "lucide-react";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import { DoctorAvailabilityDayRow } from "./doctor-availability-day-row";
import { useDoctorAvailabilitySettings } from "./use-doctor-availability-settings";

export function DoctorAvailabilitySettings() {
  const availability = useDoctorAvailabilitySettings();

  if (availability.isLoading) {
    return (
      <Card
        role="status"
        aria-live="polite"
        aria-label="Loading doctor availability"
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full max-w-xs" />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
          <div className="flex justify-center py-4">
            <DocitaLoadingIndicator
              variant="section"
              withStatusRole={false}
              iconClassName="h-8 w-8 text-muted-foreground"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-info" />
            <div>
              <CardTitle>Doctor availability</CardTitle>
              <CardDescription>
                Working hours and slot duration per doctor.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pt-5">
          {availability.isAdmin && availability.doctors.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="availability-doctor">Select Doctor</Label>
              <Select
                value={availability.selectedDoctorId}
                onValueChange={availability.setSelectedDoctorId}
              >
                <SelectTrigger
                  id="availability-doctor"
                  className="w-full sm:w-64"
                >
                  <SelectValue placeholder="Doctor" />
                </SelectTrigger>
                <SelectContent>
                  {availability.doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name}
                      {doctor.specialization ? (
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({doctor.specialization})
                        </span>
                      ) : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="flex flex-col gap-1">
            <span className="ui-eyebrow">
              {availability.selectedDoctorName}&apos;s weekly schedule
            </span>
            <p className="text-xs text-muted-foreground">
              Toggle days on or off and set hours individually.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {availability.daySchedules.map((day) => (
              <DoctorAvailabilityDayRow
                key={day.dayOfWeek}
                day={day}
                onUpdate={(patch) =>
                  availability.updateDay(day.dayOfWeek, patch)
                }
              />
            ))}
          </div>

          <div className="flex justify-end border-t border-border/60 pt-4">
            <Button
              onClick={availability.handleSave}
              disabled={availability.isSaving}
            >
              {availability.isSaving ? (
                <>
                  <DocitaLoadingIndicator
                    variant="inline"
                    decorative
                    className="mr-2"
                  />
                  Saving…
                </>
              ) : (
                "Save availability"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
