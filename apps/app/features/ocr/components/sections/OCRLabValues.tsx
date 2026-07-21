// jscpd:ignore-start
import {
  Input,
  Label
} from "@workspace/ui/components";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfidenceIndicator } from "@/features/ocr/components/common/confidence-indicator";
import { SectionToggle } from "@/features/ocr/components/common/section-toggle";
import { OCRFormData } from "@/features/ocr/types";

/**
 * Phase 3 (per-feature): apps/app OCR > Lab values section.
 * 6 literals converted to useTranslations("Ocr.labValues").
 */
function useOcrLabValuesTranslations() {
  return useTranslations("Ocr.labValues");
}

interface OCRLabValuesProps {
  formData: OCRFormData;
  setFormData: (data: OCRFormData) => void;
  getScore: (key: string) => number | undefined;
  isOpen: boolean;
  onToggle: () => void;
}

export const OCRLabValues = ({
  formData,
  setFormData,
  getScore,
  isOpen,
  onToggle,
}: OCRLabValuesProps) => {
  const t = useOcrLabValuesTranslations();
  return (
    <div className="space-y-3">
      <SectionToggle
        title={t("sectionTitle")}
        icon={FileText}
        isOpen={isOpen}
        onToggle={onToggle}
      />
      {isOpen && (
        <div className="space-y-3 bg-muted/30 rounded-lg p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t("glucoseLabel")}</Label>
{/* jscpd:ignore-end */}
                <ConfidenceIndicator
                  {...((s) => (s != null ? { score: s } : {}))(
                    getScore("labValues_glucose"),
                  )}
                />
              </div>
              <Input
                value={formData.labValues.glucose}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    labValues: {
                      ...formData.labValues,
                      glucose: e.target.value,
                    },
                  })
                }
                placeholder={t("glucosePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t("hemoglobinLabel")}</Label>
                <ConfidenceIndicator
                  {...((s) => (s != null ? { score: s } : {}))(
                    getScore("labValues_hemoglobin"),
                  )}
                />
              </div>
              <Input
                value={formData.labValues.hemoglobin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    labValues: {
                      ...formData.labValues,
                      hemoglobin: e.target.value,
                    },
                  })
                }
                placeholder={t("hemoglobinPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t("creatinineLabel")}</Label>
                <ConfidenceIndicator
                  {...((s) => (s != null ? { score: s } : {}))(
                    getScore("labValues_creatinine"),
                  )}
                />
              </div>
              <Input
                value={formData.labValues.creatinine}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    labValues: {
                      ...formData.labValues,
                      creatinine: e.target.value,
                    },
                  })
                }
                placeholder={t("creatininePlaceholder")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
