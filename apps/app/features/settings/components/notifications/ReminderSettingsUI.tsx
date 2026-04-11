"use client";

import { FC, useEffect, useState } from "react";
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
import { Switch } from "@workspace/ui/components/switch";
import { Bell, Loader2, MessageSquare } from "lucide-react";
import {
  ClinicAppSettings,
  useClinicSettings,
  useUpdateClinicSettings,
} from "@/hooks/api/use-settings";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

const TIME_UNITS = [
  { value: "minute", label: "Minutes" },
  { value: "hour", label: "Hours" },
  { value: "day", label: "Days" },
  { value: "week", label: "Weeks" },
];

interface ReminderRowProps {
  label: string;
  description: string;
  enabled: boolean;
  before: string;
  unit: string;
  onToggle: (val: boolean) => void;
  onBeforeChange: (val: string) => void;
  onUnitChange: (val: string) => void;
}

function ReminderRow({
  label,
  description,
  enabled,
  before,
  unit,
  onToggle,
  onBeforeChange,
  onUnitChange,
}: ReminderRowProps) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {enabled && (
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">
            Send
          </Label>
          <Input
            type="number"
            min={1}
            className="w-20 h-8 text-sm"
            value={before}
            onChange={(e) => onBeforeChange(e.target.value)}
          />
          <Select value={unit} onValueChange={onUnitChange}>
            <SelectTrigger className="w-28 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_UNITS.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">before</span>
        </div>
      )}
    </div>
  );
}

export const ReminderSettingsUI: FC = () => {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } = useUpdateClinicSettings();

  const [appointmentEnabled, setAppointmentEnabled] = useState(true);
  const [appointmentBefore, setAppointmentBefore] = useState("1");
  const [appointmentUnit, setAppointmentUnit] = useState("day");

  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpBefore, setFollowUpBefore] = useState("1");
  const [followUpUnit, setFollowUpUnit] = useState("day");

  const [invoiceEnabled, setInvoiceEnabled] = useState(false);
  const [invoiceBefore, setInvoiceBefore] = useState("3");
  const [invoiceUnit, setInvoiceUnit] = useState("day");

  const [prescriptionEnabled, setPrescriptionEnabled] = useState(false);
  const [prescriptionBefore, setPrescriptionBefore] = useState("1");
  const [prescriptionUnit, setPrescriptionUnit] = useState("day");

  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleBefore, setScheduleBefore] = useState("1");
  const [scheduleUnit, setScheduleUnit] = useState("hour");

  const [whatsappPreAppointmentEnabled, setWhatsappPreAppointmentEnabled] =
    useState(false);
  const [whatsappPreAppointmentMinutes, setWhatsappPreAppointmentMinutes] =
    useState(30);

  useEffect(() => {
    if (!clinic) return;
    const s = (clinic.settings as ClinicAppSettings) || {};

    setAppointmentEnabled(s.reminderBefore !== undefined);
    setAppointmentBefore(String(s.reminderBefore ?? "1"));
    setAppointmentUnit(String(s.reminderUnit ?? "day"));

    setFollowUpEnabled(s.followUpReminderEnabled ?? false);
    setFollowUpBefore(s.followUpReminderBefore ?? "1");
    setFollowUpUnit(s.followUpReminderUnit ?? "day");

    setInvoiceEnabled(s.invoiceReminderEnabled ?? false);
    setInvoiceBefore(s.invoiceReminderBefore ?? "3");
    setInvoiceUnit(s.invoiceReminderUnit ?? "day");

    setPrescriptionEnabled(s.prescriptionReminderEnabled ?? false);
    setPrescriptionBefore(s.prescriptionReminderBefore ?? "1");
    setPrescriptionUnit(s.prescriptionReminderUnit ?? "day");

    setScheduleEnabled(s.scheduleNotificationEnabled ?? false);
    setScheduleBefore(s.scheduleNotificationBefore ?? "1");
    setScheduleUnit(s.scheduleNotificationUnit ?? "hour");

    setWhatsappPreAppointmentEnabled(s.whatsappPreAppointmentEnabled ?? false);
    setWhatsappPreAppointmentMinutes(s.whatsappPreAppointmentMinutes ?? 30);
  }, [clinic]);

  const handleSave = () => {
    updateSettings(
      {
        reminderBefore: appointmentEnabled ? appointmentBefore : undefined,
        reminderUnit: appointmentEnabled ? appointmentUnit : undefined,
        followUpReminderEnabled: followUpEnabled,
        followUpReminderBefore: followUpBefore,
        followUpReminderUnit: followUpUnit,
        invoiceReminderEnabled: invoiceEnabled,
        invoiceReminderBefore: invoiceBefore,
        invoiceReminderUnit: invoiceUnit,
        prescriptionReminderEnabled: prescriptionEnabled,
        prescriptionReminderBefore: prescriptionBefore,
        prescriptionReminderUnit: prescriptionUnit,
        scheduleNotificationEnabled: scheduleEnabled,
        scheduleNotificationBefore: scheduleBefore,
        scheduleNotificationUnit: scheduleUnit,
        whatsappPreAppointmentEnabled,
        whatsappPreAppointmentMinutes,
      },
      {
        onSuccess: () => {
          toast.success("Reminder settings saved");
        },
        onError: (error) => {
          showUserFacingErrorToast(
            error,
            "We could not save these reminder settings. Please try again.",
            "save",
          );
        },
      },
    );
  };

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
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Reminder Settings</CardTitle>
              <CardDescription>
                Configure when reminders are sent to patients
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ReminderRow
            label="Appointment Reminder"
            description="Remind patient before their scheduled appointment"
            enabled={appointmentEnabled}
            before={appointmentBefore}
            unit={appointmentUnit}
            onToggle={setAppointmentEnabled}
            onBeforeChange={setAppointmentBefore}
            onUnitChange={setAppointmentUnit}
          />

          <ReminderRow
            label="Follow-up Visit Reminder"
            description="Remind patient about their scheduled follow-up visit"
            enabled={followUpEnabled}
            before={followUpBefore}
            unit={followUpUnit}
            onToggle={setFollowUpEnabled}
            onBeforeChange={setFollowUpBefore}
            onUnitChange={setFollowUpUnit}
          />

          <ReminderRow
            label="Invoice / Payment Reminder"
            description="Remind patient about pending bills or upcoming payment due dates"
            enabled={invoiceEnabled}
            before={invoiceBefore}
            unit={invoiceUnit}
            onToggle={setInvoiceEnabled}
            onBeforeChange={setInvoiceBefore}
            onUnitChange={setInvoiceUnit}
          />

          <ReminderRow
            label="Prescription Reminder"
            description="Remind patient to take or refill their prescribed medication"
            enabled={prescriptionEnabled}
            before={prescriptionBefore}
            unit={prescriptionUnit}
            onToggle={setPrescriptionEnabled}
            onBeforeChange={setPrescriptionBefore}
            onUnitChange={setPrescriptionUnit}
          />

          <ReminderRow
            label="Appointment Schedule Notification"
            description="Notify patient when their appointment is scheduled or rescheduled"
            enabled={scheduleEnabled}
            before={scheduleBefore}
            unit={scheduleUnit}
            onToggle={setScheduleEnabled}
            onBeforeChange={setScheduleBefore}
            onUnitChange={setScheduleUnit}
          />
        </CardContent>
      </Card>

      <Card >
        <CardHeader>
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>WhatsApp Pre-Appointment Message</CardTitle>
              <CardDescription>
                Send a WhatsApp message before the appointment with status
                options for the patient
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Enable pre-appointment message</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Patient receives a WhatsApp message before their appointment and
                can reply with: On Time, Delayed, or Cancelled. Their reply
                updates the appointment status and notifies the doctor.
              </p>
            </div>
            <Switch
              checked={whatsappPreAppointmentEnabled}
              onCheckedChange={setWhatsappPreAppointmentEnabled}
            />
          </div>

          {whatsappPreAppointmentEnabled && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">
                Send
              </Label>
              <Input
                type="number"
                min={5}
                max={120}
                step={5}
                className="w-20 h-8 text-sm"
                value={whatsappPreAppointmentMinutes}
                onChange={(e) =>
                  setWhatsappPreAppointmentMinutes(Number(e.target.value))
                }
              />
              <span className="text-xs text-muted-foreground">
                minutes before appointment
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Button className="w-full" onClick={handleSave} disabled={isSaving}>
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Reminder Settings
      </Button>
    </div>
  );
};
