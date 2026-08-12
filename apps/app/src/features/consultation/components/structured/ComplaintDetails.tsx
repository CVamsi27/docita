import { useTranslation } from "react-i18next";
import { Label } from "@workspace/ui/components/form/label";
import { Input } from "@workspace/ui/components/form/input";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { MicButton } from "@workspace/ui/components/form/mic-button";
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

const COMPLAINT_UNIT_OPTIONS: ReadonlyArray<{ value: string; labelKey: string }> = [
  { value: "hours", labelKey: "complaint.unitHours" },
  { value: "days", labelKey: "complaint.unitDays" },
  { value: "weeks", labelKey: "complaint.unitWeeks" },
  { value: "months", labelKey: "complaint.unitMonths" },
  { value: "years", labelKey: "complaint.unitYears" },
];

const COMPLAINT_SEVERITY_OPTIONS: ReadonlyArray<{ value: string; labelKey: string }> = [
  { value: "mild", labelKey: "complaint.severityMild" },
  { value: "moderate", labelKey: "complaint.severityModerate" },
  { value: "severe", labelKey: "complaint.severitySevere" },
  { value: "critical", labelKey: "complaint.severityCritical" },
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
  const { t } = useTranslation("Consultation");
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`chief-complaint-${index}`}>
          {t("complaint.symptomLabel")}
        </Label>
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
        placeholder={t("complaint.symptomPlaceholder")}
        value={item.complaint}
        onChange={(e) => onUpdate("complaint", e.target.value)}
        readOnly={readOnly}
        className="h-11 bg-background"
      />
      {!readOnly && !hasComplaint ? (
        <p className="text-sm text-warning">
          {t("complaint.symptomRequired")}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`duration-value-${index}`}>
            {t("complaint.durationLabel")}
          </Label>
          <Input
            id={`duration-value-${index}`}
            type="number"
            min="1"
            placeholder={t("complaint.durationPlaceholder")}
            value={item.durationValue}
            onChange={(e) => onUpdate("durationValue", e.target.value)}
            readOnly={readOnly}
            className="h-11 bg-background"
          />
          {!readOnly && hasComplaint && !isDurationValid ? (
            <p className="text-sm text-warning">
              {t("complaint.durationInvalid")}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>{t("complaint.unitLabel")}</Label>
          <SelectField
            value={item.durationUnit}
            placeholderKey="complaint.unitPlaceholder"
            options={COMPLAINT_UNIT_OPTIONS}
            readOnly={readOnly}
            onChange={(val) => onUpdate("durationUnit", val)}
            t={t}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("complaint.severityLabel")}</Label>
          <SelectField
            value={item.severity}
            placeholderKey="complaint.severityPlaceholder"
            options={COMPLAINT_SEVERITY_OPTIONS}
            readOnly={readOnly}
            onChange={(val) => onUpdate("severity", val)}
            t={t}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`complaint-notes-${index}`}>
          {t("complaint.notesLabel")}
        </Label>
        <Textarea
          id={`complaint-notes-${index}`}
          placeholder={t("complaint.notesPlaceholder")}
          value={item.notes || ""}
          onChange={(e) => onUpdate("notes", e.target.value)}
          readOnly={readOnly}
          className="min-h-[96px] bg-background"
        />
      </div>
    </div>
  );
}
