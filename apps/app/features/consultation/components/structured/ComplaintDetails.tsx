"use client";

import { useTranslations } from "next-intl";
import { Label } from "@workspace/ui/components/form/label";
import { Input } from "@workspace/ui/components/form/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { MicButton } from "@workspace/ui/components/form/mic-button";
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
          <Select
            value={item.durationUnit}
            onValueChange={(val) => onUpdate("durationUnit", val)}
            disabled={readOnly}
          >
            <SelectTrigger className="h-11 bg-background">
              <SelectValue placeholder={t("unitPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hours">{t("unitHours")}</SelectItem>
              <SelectItem value="days">{t("unitDays")}</SelectItem>
              <SelectItem value="weeks">{t("unitWeeks")}</SelectItem>
              <SelectItem value="months">{t("unitMonths")}</SelectItem>
              <SelectItem value="years">{t("unitYears")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("severityLabel")}</Label>
          <Select
            value={item.severity}
            onValueChange={(val) => onUpdate("severity", val)}
            disabled={readOnly}
          >
            <SelectTrigger className="h-11 bg-background">
              <SelectValue placeholder={t("severityPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mild">{t("severityMild")}</SelectItem>
              <SelectItem value="moderate">{t("severityModerate")}</SelectItem>
              <SelectItem value="severe">{t("severitySevere")}</SelectItem>
              <SelectItem value="critical">{t("severityCritical")}</SelectItem>
            </SelectContent>
          </Select>
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
