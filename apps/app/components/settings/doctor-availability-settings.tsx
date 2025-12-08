"use client";

import { useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Save, Clock, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiHooks } from "@/lib/api-hooks";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Textarea } from "@workspace/ui/components/textarea";
import { Badge } from "@workspace/ui/components/badge";

// Local type definition
type DayOfWeek =
  | "SUNDAY"
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY";

const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  SUNDAY: "Sunday",
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
};

interface ScheduleFormData {
  schedules: {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    slotDuration: number;
    isActive: boolean;
  }[];
}

interface TimeOffFormData {
  startDate: string;
  endDate: string;
  reason: string;
  isFullDay: boolean;
  startTime: string;
  endTime: string;
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const SLOT_DURATION_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 20, label: "20 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
];

export type DoctorAvailabilitySettingsProps = object;

export function DoctorAvailabilitySettings() {
  const { user } = useAuth();
  const [showTimeOffDialog, setShowTimeOffDialog] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string | undefined>(
    undefined,
  );
  const isAdmin = user?.role === "ADMIN" || user?.role === "ADMIN_DOCTOR";

  // Get doctors if admin
  const { data: doctors = [] } = apiHooks.useDoctors();
  const currentDoctorId = selectedDoctor || user?.id;

  // Get schedules
  const {
    data: schedules = [],
    isLoading: schedulesLoading,
    refetch: refetchSchedules,
  } = apiHooks.useDoctorSchedules(isAdmin ? currentDoctorId : undefined);

  // Get time offs
  const {
    data: timeOffs = [],
    isLoading: timeOffsLoading,
    refetch: refetchTimeOffs,
  } = apiHooks.useDoctorTimeOffs(
    isAdmin ? currentDoctorId : undefined,
    true, // upcoming only
  );

  // Mutations
  const { mutateAsync: bulkUpdateSchedules, isPending: savingSchedules } =
    apiHooks.useBulkDoctorSchedules();
  const { mutateAsync: createTimeOff, isPending: creatingTimeOff } =
    apiHooks.useCreateDoctorTimeOff();

  // Build initial form values from existing schedules
  const existingSchedulesByDay = useMemo(() => {
    const map: Record<string, (typeof schedules)[0]> = {};
    schedules.forEach((s) => {
      map[s.dayOfWeek] = s;
    });
    return map;
  }, [schedules]);

  const defaultScheduleValues: ScheduleFormData = useMemo(
    () => ({
      schedules: DAYS_OF_WEEK.map((day) => {
        const existing = existingSchedulesByDay[day];
        return {
          dayOfWeek: day,
          startTime: existing?.startTime || "09:00",
          endTime: existing?.endTime || "17:00",
          slotDuration: existing?.slotDuration || 30,
          isActive: existing?.isActive ?? day !== "SUNDAY",
        };
      }),
    }),
    [existingSchedulesByDay],
  );

  const scheduleForm = useForm<ScheduleFormData>({
    defaultValues: defaultScheduleValues,
  });

  const { fields } = useFieldArray({
    control: scheduleForm.control,
    name: "schedules",
  });

  // Reset form when schedules change
  useMemo(() => {
    scheduleForm.reset(defaultScheduleValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultScheduleValues]);

  const timeOffForm = useForm<TimeOffFormData>({
    defaultValues: {
      startDate: "",
      endDate: "",
      reason: "",
      isFullDay: true,
      startTime: "09:00",
      endTime: "17:00",
    },
  });

  const onSaveSchedules = async (data: ScheduleFormData) => {
    try {
      const activeSchedules = data.schedules.filter((s) => s.isActive);
      await bulkUpdateSchedules({
        doctorId: isAdmin ? currentDoctorId : undefined,
        schedules: activeSchedules,
      });
      toast.success("Schedule saved successfully");
      refetchSchedules();
    } catch (error) {
      console.error("Failed to save schedule:", error);
      toast.error("Failed to save schedule");
    }
  };

  const onCreateTimeOff = async (data: TimeOffFormData) => {
    try {
      await createTimeOff({
        doctorId: isAdmin ? currentDoctorId : undefined,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason || undefined,
        isFullDay: data.isFullDay,
        startTime: data.isFullDay ? undefined : data.startTime,
        endTime: data.isFullDay ? undefined : data.endTime,
      });
      toast.success("Time off added successfully");
      setShowTimeOffDialog(false);
      timeOffForm.reset();
      refetchTimeOffs();
    } catch (error) {
      console.error("Failed to create time off:", error);
      toast.error("Failed to add time off");
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (schedulesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Doctor selector for admins */}
      {isAdmin && doctors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Doctor</CardTitle>
            <CardDescription>
              Choose which doctor&apos;s availability to manage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={currentDoctorId}
              onValueChange={(value) => setSelectedDoctor(value)}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors
                  .filter(
                    (d) => d.role === "DOCTOR" || d.role === "ADMIN_DOCTOR",
                  )
                  .map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Weekly Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Weekly Schedule
              </CardTitle>
              <CardDescription>
                Set your regular working hours for each day of the week
              </CardDescription>
            </div>
            <Button
              onClick={scheduleForm.handleSubmit(onSaveSchedules)}
              disabled={savingSchedules}
            >
              {savingSchedules ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Schedule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Day</TableHead>
                <TableHead className="w-[100px]">Active</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Slot Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => {
                const isActive = scheduleForm.watch(
                  `schedules.${index}.isActive`,
                );
                return (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium">
                      {DAY_OF_WEEK_LABELS[field.dayOfWeek as DayOfWeek]}
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={isActive}
                        onCheckedChange={(checked: boolean) =>
                          scheduleForm.setValue(
                            `schedules.${index}.isActive`,
                            checked,
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        {...scheduleForm.register(
                          `schedules.${index}.startTime`,
                        )}
                        disabled={!isActive}
                        className="w-[120px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        {...scheduleForm.register(`schedules.${index}.endTime`)}
                        disabled={!isActive}
                        className="w-[120px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={String(
                          scheduleForm.watch(`schedules.${index}.slotDuration`),
                        )}
                        onValueChange={(value) =>
                          scheduleForm.setValue(
                            `schedules.${index}.slotDuration`,
                            Number(value),
                          )
                        }
                        disabled={!isActive}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SLOT_DURATION_OPTIONS.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={String(opt.value)}
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Time Off / Leave */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Time Off & Leave
              </CardTitle>
              <CardDescription>
                Manage vacation days, sick leave, and other time off
              </CardDescription>
            </div>
            <Button onClick={() => setShowTimeOffDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Time Off
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {timeOffsLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : timeOffs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No upcoming time off scheduled</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeOffs.map((timeOff) => (
                  <TableRow key={timeOff.id}>
                    <TableCell>
                      {formatDate(timeOff.startDate)}
                      {timeOff.startDate !== timeOff.endDate &&
                        ` - ${formatDate(timeOff.endDate)}`}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={timeOff.isFullDay ? "default" : "secondary"}
                      >
                        {timeOff.isFullDay
                          ? "Full Day"
                          : `${timeOff.startTime} - ${timeOff.endTime}`}
                      </Badge>
                    </TableCell>
                    <TableCell>{timeOff.reason || "-"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" disabled>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Time Off Dialog */}
      <Dialog open={showTimeOffDialog} onOpenChange={setShowTimeOffDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Time Off</DialogTitle>
            <DialogDescription>
              Schedule vacation, sick leave, or other unavailable time
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={timeOffForm.handleSubmit(onCreateTimeOff)}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...timeOffForm.register("startDate", { required: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    {...timeOffForm.register("endDate", { required: true })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isFullDay"
                  checked={timeOffForm.watch("isFullDay")}
                  onCheckedChange={(checked: boolean) =>
                    timeOffForm.setValue("isFullDay", checked)
                  }
                />
                <Label htmlFor="isFullDay">Full Day</Label>
              </div>

              {!timeOffForm.watch("isFullDay") && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      {...timeOffForm.register("startTime")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      {...timeOffForm.register("endTime")}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason">Reason (optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="e.g., Annual leave, Conference, etc."
                  {...timeOffForm.register("reason")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTimeOffDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creatingTimeOff}>
                {creatingTimeOff && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Add Time Off
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
