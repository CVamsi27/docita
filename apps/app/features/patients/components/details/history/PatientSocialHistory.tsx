// jscpd:ignore-start
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives";
import { Card, CardContent, CardHeader, CardTitle, Label } from "@workspace/ui/components";
import { Coffee } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  ALCOHOL_USE_STATUS_LABELS,
  alcoholUseStatusSchema,
  PatientSocialHistory,
  PatientWithMedicalHistory,
  SMOKING_STATUS_LABELS,
  smokingStatusSchema,
} from "@workspace/types";
// jscpd:ignore-end
import { HistoryBlock } from "./HistoryBlock";

interface PatientSocialHistoryProps {
  patient: PatientWithMedicalHistory;
  readOnly: boolean;
  isCompact?: boolean;
  onSocialHistoryUpdate: (
    field: keyof PatientSocialHistory,
    value: string,
  ) => void;
}

export function PatientSocialHistoryComp({
  patient,
  readOnly,
  isCompact,
  onSocialHistoryUpdate,
}: PatientSocialHistoryProps) {
  const t = useTranslations("Patients.medicalHistory.socialHistory");
  const fields = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="smokingStatus" className="text-xs font-medium">
          {t("smokingStatusLabel")}
        </Label>
        <Select
          value={patient.socialHistory?.smokingStatus || "UNKNOWN"}
          onValueChange={(value) =>
            onSocialHistoryUpdate("smokingStatus", value)
          }
          disabled={readOnly}
        >
          <SelectTrigger id="smokingStatus" className="h-9">
            <SelectValue placeholder={t("smokingStatusLabel")} />
          </SelectTrigger>
          <SelectContent>
            {smokingStatusSchema.options.map((status) => (
              <SelectItem key={status} value={status}>
                {SMOKING_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="alcoholUse" className="text-xs font-medium">
          {t("alcoholUseLabel")}
        </Label>
        <Select
          value={patient.socialHistory?.alcoholUse || "UNKNOWN"}
          onValueChange={(value) =>
            onSocialHistoryUpdate("alcoholUse", value)
          }
          disabled={readOnly}
        >
          <SelectTrigger id="alcoholUse" className="h-9">
            <SelectValue placeholder={t("alcoholUseLabel")} />
          </SelectTrigger>
          <SelectContent>
            {alcoholUseStatusSchema.options.map((status) => (
              <SelectItem key={status} value={status}>
                {ALCOHOL_USE_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="occupation" className="text-xs font-medium">
          {t("occupationLabel")}
        </Label>
        <Input
          id="occupation"
          placeholder={t("occupationPlaceholder")}
          value={patient.socialHistory?.occupation || ""}
          onChange={(e) => onSocialHistoryUpdate("occupation", e.target.value)}
          disabled={readOnly}
          className="h-9"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dietaryRestrictions" className="text-xs font-medium">
          {t("dietaryLabel")}
        </Label>
        <Input
          id="dietaryRestrictions"
          placeholder={t("dietaryPlaceholder")}
          value={patient.socialHistory?.dietaryRestrictions || ""}
          onChange={(e) =>
            onSocialHistoryUpdate("dietaryRestrictions", e.target.value)
          }
          disabled={readOnly}
          className="h-9"
        />
      </div>
    </div>
  );

  if (isCompact) {
    return (
      <HistoryBlock
        icon={<Coffee className="h-3.5 w-3.5 text-warning" />}
        title={t("title")}
      >
        {fields}
      </HistoryBlock>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader className="py-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Coffee className="h-5 w-5 text-warning" />
          {t("titleLower")}
        </CardTitle>
      </CardHeader>
      <CardContent>{fields}</CardContent>
    </Card>
  );
}
