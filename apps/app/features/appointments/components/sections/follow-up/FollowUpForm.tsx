import React from "react";
import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@workspace/ui/components/form/form-primitives";
import { Label, Switch } from "@workspace/ui/components";
import { Bell, Clock, MessageSquare } from "lucide-react";

interface FollowUpType {
  value: string;
  label: string;
}

interface FollowUpFormProps {
  followUpType: string;
  onTypeChange: (value: string) => void;
  selectedTime: string;
  onTimeChange: (value: string) => void;
  reminderEnabled: boolean;
  onReminderEnabledChange: (checked: boolean) => void;
  reminderDays: number;
  onReminderDaysChange: (value: number) => void;
  whatsappReminder: boolean;
  onWhatsappReminderChange: (checked: boolean) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  followUpTypes: FollowUpType[];
  reminderOptions: { value: number; label: string }[];
}

/**
 * Phase 3 (per-feature): apps/app Appointments > follow-up form.
 * 5 literals converted to useTranslations("Appointments.followUpForm").
 */
function useFollowUpFormTranslations() {
  return useTranslations("Appointments.followUpForm");
}

export function FollowUpForm({
  followUpType,
  onTypeChange,
  selectedTime,
  onTimeChange,
  reminderEnabled,
  onReminderEnabledChange,
  reminderDays,
  onReminderDaysChange,
  whatsappReminder,
  onWhatsappReminderChange,
  notes,
  onNotesChange,
  followUpTypes,
  reminderOptions,
}: FollowUpFormProps) {
  const t = useFollowUpFormTranslations();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">{t("typeLabel")}</Label>
          <Select value={followUpType} onValueChange={onTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder={t("typePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {followUpTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">{t("timeLabel")}</Label>
          <div className="relative">
            <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Select value={selectedTime} onValueChange={onTimeChange}>
              <SelectTrigger className="pl-8">
                <SelectValue placeholder={t("timePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }).map((_, i) => {
                  const hour = i;
                  const time = `${hour.toString().padStart(2, "0")}:00`;
                  return (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="reminder-mode">{t("sendReminderLabel")}</Label>
          </div>
          <Switch
            id="reminder-mode"
            checked={reminderEnabled}
            onCheckedChange={onReminderEnabledChange}
          />
        </div>

        {reminderEnabled && (
          <div className="pl-6 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">{t("whenLabel")}</Label>
                <Select
                  value={reminderDays.toString()}
                  onValueChange={(v) => onReminderDaysChange(parseInt(v))}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reminderOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-success" />
                <Label htmlFor="whatsapp-mode" className="text-xs">
                  {t("whatsappNotificationLabel")}
                </Label>
              </div>
              <Switch
                id="whatsapp-mode"
                checked={whatsappReminder}
                onCheckedChange={onWhatsappReminderChange}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t("notesLabel")}</Label>
        <Textarea
          placeholder={t("notesPlaceholder")}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="h-20 resize-none"
        />
      </div>
    </div>
  );
}
