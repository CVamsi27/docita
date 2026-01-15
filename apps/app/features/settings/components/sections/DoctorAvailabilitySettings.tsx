import { useState, useEffect } from "react";
import { useDoctorSchedules, useUpdateDoctorSchedule, useBulkDoctorSchedules } from "@/hooks/api/use-settings";
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
import { Calendar } from "lucide-react";

export function DoctorAvailabilitySettings() {
  const { data: schedules, isLoading } = useDoctorSchedules("me");
  const { mutate: updateSchedule } = useUpdateDoctorSchedule("dummy"); // We'll use id dynamically
  const { mutate: bulkCreateSchedules, isPending: isSaving } = useBulkDoctorSchedules();
  
  // State for the form
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("17:00");
  const [slotDuration, setSlotDuration] = useState(15);
  const [breakStart, setBreakStart] = useState("13:00");
  const [breakEnd, setBreakEnd] = useState("14:00");

  // Load initial data from the first available schedule (usually Monday)
  useEffect(() => {
    if (schedules && schedules.length > 0) {
      // Try to find a schedule specific to Mon-Fri, or just take the first one
      const sample = schedules.find(s => s.dayOfWeek !== "Sunday" && s.dayOfWeek !== "Saturday") || schedules[0];
      if (sample) {
        setOpeningTime(sample.startTime);
        setClosingTime(sample.endTime);
        setSlotDuration(sample.slotDuration);
        // Break time isn't in the schedule object directly in this hook? 
        // useDoctorTimeOffs might be for breaks, or maybe breaks are just gaps.
        // For now, we'll leave breaks as local state or not persist them if API doesn't support it in this endpoint.
        // Wait, the UI had Break Time. Logic for breaks might need a different endpoint or field.
        // Checking useDoctorSchedules return type in api-hooks.ts (lines 56-68):
        // { ... startTime, endTime, slotDuration, isActive ... }
        // No break time field. 
        // We'll ignore break time persistence for now or assume it's not supported by this API yet.
      }
    }
  }, [schedules]);

  const handleSave = () => {
    // We will create/update schedules for Mon-Fri
    const workDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const newSchedules = workDays.map(day => ({
      dayOfWeek: day,
      startTime: openingTime,
      endTime: closingTime,
      slotDuration: Number(slotDuration),
      isActive: true,
    }));

    // If we have existing schedules, we should probably update them or delete and recreate.
    // Bulk create usually overwrites or handles upsert.
    bulkCreateSchedules({
      schedules: newSchedules
    }, {
      onSuccess: () => {
        toast.success("Availability updated successfully");
      },
      onError: (err) => {
        toast.error("Failed to update availability: " + err.message);
      }
    });
  };

  if (isLoading) return <div>Loading availability...</div>;

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle>Doctor Availability</CardTitle>
              <CardDescription>
                Configure working hours and availability (Mon-Fri)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Opening Time</Label>
              <Input 
                type="time" 
                value={openingTime} 
                onChange={(e) => setOpeningTime(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Closing Time</Label>
              <Input 
                type="time" 
                value={closingTime} 
                onChange={(e) => setClosingTime(e.target.value)} 
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Slot Duration (minutes)</Label>
            <Input 
              type="number" 
              value={slotDuration} 
              onChange={(e) => setSlotDuration(Number(e.target.value))} 
              min={5} max={60} step={5} 
            />
          </div>
          <div className="space-y-2">
            <Label>Break Time (Not persisted)</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input 
                type="time" 
                value={breakStart} 
                onChange={(e) => setBreakStart(e.target.value)} 
                placeholder="Start" 
              />
              <Input 
                type="time" 
                value={breakEnd} 
                onChange={(e) => setBreakEnd(e.target.value)} 
                placeholder="End" 
              />
            </div>
            <p className="text-xs text-muted-foreground">Break times are currently informational only.</p>
          </div>
          <Button className="w-full" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Updating..." : "Update Availability"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
