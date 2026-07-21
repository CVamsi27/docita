// jscpd:ignore-start
import { useTranslations } from "next-intl";
import { Input, Label } from "@workspace/ui/components";
import { Activity } from "lucide-react";
import { ConfidenceIndicator } from "@/features/ocr/components/common/confidence-indicator";
import { SectionToggle } from "@/features/ocr/components/common/section-toggle";
import { OCRFormData } from "@/features/ocr/types";

interface OCRVitalsProps {
  formData: OCRFormData;
  setFormData: (data: OCRFormData) => void;
  getScore: (key: string) => number | undefined;
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * Phase 3 (per-feature): apps/app OCR > Vitals section — the
 * patient vitals fields (BP, temp, pulse, respiratory rate,
 * SpO2, glucose) the user confirms after OCR recognition.
 * 9 literals converted to useTranslations("Ocr.vitals").
 */
function useOcrVitalsTranslations() {
  return useTranslations("Ocr.vitals");
}

export const OCRVitals = ({
  formData,
  setFormData,
  getScore,
  isOpen,
  onToggle,
}: OCRVitalsProps) => {
  const t = useOcrVitalsTranslations();
  return (
    <div className="space-y-3">
      <SectionToggle
        title={t("sectionTitle")}
        icon={Activity}
        isOpen={isOpen}
        onToggle={onToggle}
      />
      {isOpen && (
        <div className="space-y-3 bg-muted/30 rounded-lg p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t("bpLabel")}</Label>
{/* jscpd:ignore-end */}
                <ConfidenceIndicator
                  {...((s) => (s != null ? { score: s } : {}))(
                    getScore("vitals_bp"),
                  )}
                />
              </div>
              <Input
                value={formData.vitals.bp}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vitals: {
                      ...formData.vitals,
                      bp: e.target.value,
                    },
                  })
                }
                placeholder={t("bpPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t("tempLabel")}</Label>
                <ConfidenceIndicator
                  {...((s) => (s != null ? { score: s } : {}))(
                    getScore("vitals_temp"),
                  )}
                />
              </div>
              <Input
                value={formData.vitals.temp}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vitals: {
                      ...formData.vitals,
                      temp: e.target.value,
                    },
                  })
                }
                placeholder={t("tempPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t("pulseLabel")}</Label>
                <ConfidenceIndicator
                  {...((s) => (s != null ? { score: s } : {}))(
                    getScore("vitals_pulse"),
                  )}
                />
              </div>
              <Input
                value={formData.vitals.pulse}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vitals: {
                      ...formData.vitals,
                      pulse: e.target.value,
                    },
                  })
                }
                placeholder={t("pulsePlaceholder")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs">{t("respiratoryRateLabel")}</Label>
              <Input
                value={formData.vitals.respiratoryRate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vitals: {
                      ...formData.vitals,
                      respiratoryRate: e.target.value,
                    },
                  })
                }
                placeholder={t("respiratoryRatePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{t("spO2Label")}</Label>
              <Input
                value={formData.vitals.spO2}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vitals: {
                      ...formData.vitals,
                      spO2: e.target.value,
                    },
                  })
                }
                placeholder={t("spO2Placeholder")}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{t("glucoseLabel")}</Label>
              <Input
                value={formData.vitals.glucose}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vitals: {
                      ...formData.vitals,
                      glucose: e.target.value,
                    },
                  })
                }
                placeholder={t("glucosePlaceholder")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
