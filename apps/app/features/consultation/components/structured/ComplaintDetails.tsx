"use client";

import { useTranslations } from "next-intl";
import { Input, Label, MicButton, Textarea } from "@workspace/ui/components";
import { SelectField } from "./_shared/SelectField";
import type { ChiefComplaintItem } from "./chief-complaint.types";

interface ComplaintDetailsProps {
  item: ChiefComplaintItem;
  index: number;
  readOnly: boolean;
  isListening: boolean;
  isSupported: boolean;
  isDurationValid: boolean;
  hasComplaint: boolean;
  onMicToggle: () => void;
  onUpdate: (field: keyof ChiefComplaintItem, value: string) => void;
}

/**
 * Phase 3 (per-feature): the chief complaint editor on the
 * consultation form. Every label, placeholder, and select
 * option resolves through useTranslations("Consultation.complaint").
 * Same pattern as the other 5 per-feature conversions this
 * session — see commit 279cf9e53 for the first one.
 */
function useComplaintTranslations() {
  return useTranslations("Consultation.complaint");
}

const COMPLAINT_UNIT_OPTIONS: ReadonlyArray<{ value: string; labelKey: string }> = [
  { value: "hours", labelKey: "unitHours" },
  { value: "days", labelKey: "unitDays" },
  { value: "weeks", labelKey: "unitWeeks" },
  { value: "months", labelKey: "unitMonths" },
  { value: "years", labelKey: "unitYears" },
];

const COMPLAINT_SEVERITY_OPTIONS: ReadonlyArray<{ value: string; labelKey: string }> = [
  { value: "mild", labelKey: "severityMild" },
  { value: "moderate", labelKey: "severityModerate" },
  { value: "severe", labelKey: "severitySevere" },
  { value: "critical", labelKey: "severityCritical" },
];

export function ComplaintDetails({
  item,
  index,
  readOnly,
  isListening,
  isSupported,
  isDurationValid,
  hasComplaint,
  onMicToggle,
  onUpdate,
}: ComplaintDetailsProps) {
  const t = useComplaintTranslations();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`chief-complaint-${index}`}>{t("symptomLabel")}</Label>
        {!readOnly ? (
          <MicButton
            isListening={isListening}
            isSupported={isSupported}
            onClick={onMicToggle}
            withLabel
          />
        ) : null}
      </div>
      <Input
        id={`chief-complaint-${index}`}
        placeholder={t("symptomPlaceholder")}
        value={item.complaint}
        onChange={(e) => onUpdate("complaint", e.target.value)}
        readOnly={readOnly}
        className="h-11 bg-background"
      />
      {!readOnly && !hasComplaint ? (
        <p className="text-sm text-warning">
          {t("symptomRequired")}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`duration-value-${index}`}>{t("durationLabel")}</Label>
          <Input
            id={`duration-value-${index}`}
            type="number"
            min="1"
            placeholder={t("durationPlaceholder")}
            value={item.durationValue}
            onChange={(e) => onUpdate("durationValue", e.target.value)}
            readOnly={readOnly}
            className="h-11 bg-background"
          />
          {!readOnly && hasComplaint && !isDurationValid ? (
            <p className="text-sm text-warning">
              {t("durationInvalid")}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>{t("unitLabel")}</Label>
          <SelectField
            value={item.durationUnit}
            placeholderKey="unitPlaceholder"
            options={COMPLAINT_UNIT_OPTIONS}
            readOnly={readOnly}
            onChange={(val) => onUpdate("durationUnit", val)}
            t={t}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("severityLabel")}</Label>
          <SelectField
            value={item.severity}
            placeholderKey="severityPlaceholder"
            options={COMPLAINT_SEVERITY_OPTIONS}
            readOnly={readOnly}
            onChange={(val) => onUpdate("severity", val)}
            t={t}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`complaint-notes-${index}`}>{t("notesLabel")}</Label>
        <Textarea
          id={`complaint-notes-${index}`}
          placeholder={t("notesPlaceholder")}
          value={item.notes || ""}
          onChange={(e) => onUpdate("notes", e.target.value)}
          readOnly={readOnly}
          className="min-h-[96px] bg-background"
        />
      </div>
    </div>
  );
}
