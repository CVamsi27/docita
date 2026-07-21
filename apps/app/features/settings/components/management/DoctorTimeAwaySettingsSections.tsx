// check-non-null-assertion: allow-file — non-null guaranteed by prior guard or Prisma include
"use client";

import { useTranslations } from "next-intl";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives";
import { Button, CardDescription, CardHeader, CardTitle, IsoDatePickerField, Label, Skeleton, Switch, SymbolTooltip } from "@workspace/ui/components";
import { Trash2 } from "lucide-react";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { formatDate } from "@workspace/utils";
import type { DoctorTimeOff } from "@workspace/data-access";

/**
 * Phase 3 (per-feature): apps/app Settings > Doctor time away
 * (doctor selector + form fields + scheduled list + card header + submit
 * button). 8 literals converted to
 * useTranslations("Settings.timeAway").
 */
function useTimeAwayTranslations() {
  return useTranslations("Settings.timeAway");
}

// ---------------------------------------------------------------------------
// DoctorSelectorSection
// ---------------------------------------------------------------------------

interface DoctorSelectorSectionProps {
  doctors: Array<{ id: string; name: string }>;
  selectedDoctorId: string;
  onDoctorChange: (id: string) => void;
}

export function DoctorSelectorSection({
  doctors,
  selectedDoctorId,
  onDoctorChange,
}: DoctorSelectorSectionProps) {
  const t = useTimeAwayTranslations();
  return (
    <div className="space-y-2">
      <Label htmlFor="time-away-doctor">{t("doctorLabel")}</Label>
      <Select value={selectedDoctorId} onValueChange={onDoctorChange}>
        <SelectTrigger id="time-away-doctor" className="w-full sm:w-72">
          <SelectValue placeholder={t("doctorPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {doctors.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface TimeAwayFormFieldsProps {
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  isFullDay: boolean;
  onIsFullDayChange: (fullDay: boolean) => void;
  partialStart: string;
  onPartialStartChange: (time: string) => void;
  partialEnd: string;
  onPartialEndChange: (time: string) => void;
}

interface TimeAwayAvailabilityControlsProps {
  isFullDay: boolean;
  onIsFullDayChange: (fullDay: boolean) => void;
  partialStart: string;
  onPartialStartChange: (time: string) => void;
  partialEnd: string;
  onPartialEndChange: (time: string) => void;
}

/** The full-day toggle plus its dependent partial-hours inputs — grouped together since one visually and functionally controls the other's visibility, split out from the date/reason fields above (which are independent of this pairing). */
function TimeAwayAvailabilityControls({
  isFullDay,
  onIsFullDayChange,
  partialStart,
  onPartialStartChange,
  partialEnd,
  onPartialEndChange,
}: TimeAwayAvailabilityControlsProps) {
  const t = useTimeAwayTranslations();
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
        <Switch
          id="time-away-full-day"
          checked={isFullDay}
          onCheckedChange={onIsFullDayChange}
        />
        <Label htmlFor="time-away-full-day" className="cursor-pointer">
          {t("fullDayLabel")}
        </Label>
      </div>
      {!isFullDay ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="time-away-partial-start">{t("awayFromLabel")}</Label>
            <Input
              id="time-away-partial-start"
              type="time"
              value={partialStart}
              onChange={(e) => onPartialStartChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time-away-partial-end">{t("awayUntilLabel")}</Label>
            <Input
              id="time-away-partial-end"
              type="time"
              value={partialEnd}
              onChange={(e) => onPartialEndChange(e.target.value)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

export function TimeAwayFormFields({
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  reason,
  onReasonChange,
  isFullDay,
  onIsFullDayChange,
  partialStart,
  onPartialStartChange,
  partialEnd,
  onPartialEndChange,
}: TimeAwayFormFieldsProps) {
  const t = useTimeAwayTranslations();
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <IsoDatePickerField
          id="time-away-start"
          label={t("startDateLabel")}
          value={startDate}
          onChange={onStartDateChange}
        />
        <IsoDatePickerField
          id="time-away-end"
          label={t("endDateLabel")}
          value={endDate}
          onChange={onEndDateChange}
        />
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="time-away-reason">{t("reasonLabel")}</Label>
          <Input
            id="time-away-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder={t("reasonPlaceholder")}
            maxLength={200}
          />
        </div>
      </div>
      <TimeAwayAvailabilityControls
        isFullDay={isFullDay}
        onIsFullDayChange={onIsFullDayChange}
        partialStart={partialStart}
        onPartialStartChange={onPartialStartChange}
        partialEnd={partialEnd}
        onPartialEndChange={onPartialEndChange}
      />
    </>
  );
}

interface ScheduledTimeAwayListProps {
  timeOffs: DoctorTimeOff[];
  isLoading: boolean;
  currentUserId?: string;
  userRole: string | undefined;
  isAdminCheck: (role: string | undefined) => boolean;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}
interface TimeAwayListItemProps {
  off: DoctorTimeOff;
  currentUserId?: string;
  userRole: string | undefined;
  isAdminCheck: (role: string | undefined) => boolean;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}

/** A single scheduled-time-away row — its date range, reason, and (when permitted) its remove action. Split out from the list's `.map` so the list component's body stays focused on the loading/empty/populated layout switch rather than a row's internals. */
function TimeAwayListItem({
  off,
  currentUserId,
  userRole,
  isAdminCheck,
  onDelete,
  isDeleting,
}: TimeAwayListItemProps) {
  const t = useTimeAwayTranslations();
  const start = new Date(off.startDate);
  const end = new Date(off.endDate);
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 px-3 py-3 text-sm">
      <div>
        <div className="font-medium">
          {formatDate(start, "MMM d, yyyy")}
          {" – "}
          {formatDate(end, "MMM d, yyyy")}
          {!off.isFullDay && off.startTime && off.endTime
            ? ` (${off.startTime}–${off.endTime})`
            : null}
        </div>
        {off.reason ? (
          <div className="text-muted-foreground">{off.reason}</div>
        ) : null}
      </div>
      {off.id && (isAdminCheck(userRole) || off.doctorId === currentUserId) ? (
        <SymbolTooltip label={t("removeTooltip")}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-destructive hover:text-destructive"
            aria-label={t("removeTooltip")}
            disabled={isDeleting}
            onClick={() => void onDelete(off.id!)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </SymbolTooltip>
      ) : null}
    </li>
  );
}

export function ScheduledTimeAwayList({
  timeOffs,
  isLoading,
  currentUserId,
  userRole,
  isAdminCheck,
  onDelete,
  isDeleting,
}: ScheduledTimeAwayListProps) {
  const t = useTimeAwayTranslations();
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{t("scheduledTitle")}</h3>
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : timeOffs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("emptyMessage")}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border">
          {timeOffs.map((off) => (
            <TimeAwayListItem
              key={off.id}
              off={off}
              currentUserId={currentUserId}
              userRole={userRole}
              isAdminCheck={isAdminCheck}
              onDelete={onDelete}
              isDeleting={isDeleting}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
// ---------------------------------------------------------------------------
// TimeAwayCardHeader
// ---------------------------------------------------------------------------

export function TimeAwayHeader() {
  const t = useTimeAwayTranslations();
  return (
    <CardHeader className="border-b border-border/60 pb-5">
      <CardTitle>{t("cardTitle")}</CardTitle>
      <CardDescription>
        {t("cardDescription")}
      </CardDescription>
    </CardHeader>
  );
}

// ---------------------------------------------------------------------------
// AddTimeAwayButton
// ---------------------------------------------------------------------------

interface AddTimeAwayButtonProps {
  isCreating: boolean;
  onClick: () => void;
}

/** The submit button with its inline saving-indicator state — split out as its own self-contained piece independent of the form fields above it. */
export function AddTimeAwayButton({
  isCreating,
  onClick,
}: AddTimeAwayButtonProps) {
  const t = useTimeAwayTranslations();
  return (
    <Button type="button" onClick={onClick} disabled={isCreating}>
      {isCreating ? (
        <>
          <DocitaLoadingIndicator
            variant="inline"
            decorative
            className="mr-2"
          />
          {t("savingLabel")}
        </>
      ) : (
        t("addTimeAwayButton")
      )}
    </Button>
  );
}
