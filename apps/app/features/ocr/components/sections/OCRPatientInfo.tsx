import { useTranslations } from "next-intl";
import { Input, Label } from "@workspace/ui/components";
import { User } from "lucide-react";
import { ConfidenceIndicator } from "@/features/ocr/components/common/confidence-indicator";
import { SectionToggle } from "@/features/ocr/components/common/section-toggle";
import { OCRFormData } from "@/features/ocr/types";

interface OCRPatientInfoProps {
  formData: OCRFormData;
  setFormData: (data: OCRFormData) => void;
  getScore: (key: string) => number | undefined;
  getCorrection: (key: string) => string | undefined;
  isOpen: boolean;
  onToggle: () => void;
  hasLowConfidence: boolean;
}

interface OcrCorrectionFieldProps {
  label: string;
  fieldKey: string;
  value: string;
  suggestionLabel: string;
  getScore: (key: string) => number | undefined;
  getCorrection: (key: string) => string | undefined;
  onChange: (value: string) => void;
}

/**
 * One OCR patient-info field: label + confidence indicator, an
 * optional correction-suggestion block, and a controlled input.
 * Used for firstName/lastName/age/phoneNumber etc. so the OCR
 * section can render any number of fields without duplicating
 * the same JSX shape.
 */
function OcrCorrectionField({
  label,
  fieldKey,
  value,
  suggestionLabel,
  getScore,
  getCorrection,
  onChange,
}: OcrCorrectionFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <ConfidenceIndicator
          {...((s) => (s != null ? { score: s } : {}))(getScore(fieldKey))}
        />
      </div>
      {getCorrection(fieldKey) && (
        <div className="text-xs surface-warning p-2 rounded">
          <p className="font-medium">{suggestionLabel}</p>
          <p>{getCorrection(fieldKey)}</p>
        </div>
      )}
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/**
 * Phase 3 (per-feature): apps/app OCR > Patient Info
 * section — the patient identity fields (name, age, phone,
 * email, blood type) the user confirms after OCR
 * recognition. 10 literals converted to
 * useTranslations("Ocr.patientInfo").
 */
function useOcrPatientInfoTranslations() {
  return useTranslations("Ocr.patientInfo");
}

export const OCRPatientInfo = ({
  formData,
  setFormData,
  getScore,
  getCorrection,
  isOpen,
  onToggle,
  hasLowConfidence,
}: OCRPatientInfoProps) => {
  const t = useOcrPatientInfoTranslations();
  return (
    <div className="space-y-3">
      <SectionToggle
        title={t("sectionTitle")}
        icon={User}
        isOpen={isOpen}
        onToggle={onToggle}
        {...(hasLowConfidence ? { badge: t("lowConfidenceBadge") } : {})}
      />
      {isOpen && (
        <div className="space-y-3 bg-muted/30 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-4">
            <OcrCorrectionField
              label={t("firstNameLabel")}
              fieldKey="firstName"
              value={formData.firstName}
              suggestionLabel={t("suggestionLabel")}
              getScore={getScore}
              getCorrection={getCorrection}
              onChange={(value) =>
                setFormData({ ...formData, firstName: value })
              }
            />
            <OcrCorrectionField
              label={t("lastNameLabel")}
              fieldKey="lastName"
              value={formData.lastName}
              suggestionLabel={t("suggestionLabel")}
              getScore={getScore}
              getCorrection={getCorrection}
              onChange={(value) =>
                setFormData({ ...formData, lastName: value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t("ageLabel")}</Label>
                <ConfidenceIndicator
                  {...((s) => (s != null ? { score: s } : {}))(getScore("age"))}
                />
              </div>
              <Input
                value={formData.age}
                onChange={(e) =>
                  setFormData({ ...formData, age: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t("phoneLabel")}</Label>
                <ConfidenceIndicator
                  {...((s) => (s != null ? { score: s } : {}))(
                    getScore("phoneNumber"),
                  )}
                />
              </div>
              <Input
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    phoneNumber: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">{t("emailLabel")}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{t("bloodTypeLabel")}</Label>
              <Input
                value={formData.bloodType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bloodType: e.target.value,
                  })
                }
                placeholder={t("bloodTypePlaceholder")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
