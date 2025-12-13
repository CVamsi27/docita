"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import {
  AlertTriangle,
  Clock,
  Info,
  Loader2,
  Save,
  Timer,
  Users,
} from "lucide-react";
import { apiHooks } from "@/lib/api-hooks";
import { toast } from "sonner";

export function QueueSettings() {
  const { data: settings, isLoading, refetch } = apiHooks.useQueueSettings();
  const [saving, setSaving] = useState(false);

  const [queueBufferMinutes, setQueueBufferMinutes] = useState(10);
  const [useDoctorQueues, setUseDoctorQueues] = useState(false);
  const [lateArrivalGraceMinutes, setLateArrivalGraceMinutes] = useState(30);
  const [avgConsultationMinutes, setAvgConsultationMinutes] = useState(15);

  // Initialize from settings when loaded
  useEffect(() => {
    if (settings) {
      setQueueBufferMinutes(settings.queueBufferMinutes);
      setUseDoctorQueues(settings.useDoctorQueues);
      setLateArrivalGraceMinutes(settings.lateArrivalGraceMinutes);
      setAvgConsultationMinutes(settings.avgConsultationMinutes);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/queue/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queueBufferMinutes,
          useDoctorQueues,
          lateArrivalGraceMinutes,
          avgConsultationMinutes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      toast.success("Queue settings saved");
      refetch();
    } catch {
      toast.error("Failed to save queue settings");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Appointment Buffer Time
          </CardTitle>
          <CardDescription>
            How early or late a patient can check in and still be considered
            on-time for their scheduled appointment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select
              value={String(queueBufferMinutes)}
              onValueChange={(value) => setQueueBufferMinutes(Number(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="20">20 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary">±{queueBufferMinutes} min window</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            <Info className="h-4 w-4 inline mr-1" />
            Patients arriving within {queueBufferMinutes} minutes of their
            scheduled time will get priority in queue
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Late Arrival Grace Period
          </CardTitle>
          <CardDescription>
            How long after their scheduled time a patient can still check in
            before losing their appointment slot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select
              value={String(lateArrivalGraceMinutes)}
              onValueChange={(value) =>
                setLateArrivalGraceMinutes(Number(value))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="20">20 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-orange-600">
              Late after {lateArrivalGraceMinutes} min
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            <Info className="h-4 w-4 inline mr-1" />
            Patients arriving more than {lateArrivalGraceMinutes} minutes late
            will be treated as walk-ins
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Doctor-Specific Queues
          </CardTitle>
          <CardDescription>
            Enable separate queues for each doctor (for multi-doctor clinics)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Doctor Queues</Label>
              <p className="text-sm text-muted-foreground">
                Each doctor will have their own queue instead of a single clinic
                queue
              </p>
            </div>
            <Select
              value={useDoctorQueues ? "yes" : "no"}
              onValueChange={(value) => setUseDoctorQueues(value === "yes")}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">Disabled</SelectItem>
                <SelectItem value="yes">Enabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Average Consultation Duration
          </CardTitle>
          <CardDescription>
            Used to calculate estimated wait times for patients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={5}
                max={60}
                step={5}
                value={avgConsultationMinutes}
                onChange={(e) =>
                  setAvgConsultationMinutes(Number(e.target.value))
                }
                className="w-[100px]"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            <Info className="h-4 w-4 inline mr-1" />
            This value is automatically updated based on actual consultation
            durations
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Queue Settings
        </Button>
      </div>
    </div>
  );
}
