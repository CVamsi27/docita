import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { FileText } from "lucide-react";
import { ConfidenceIndicator } from "@/features/ocr/components/common/confidence-indicator";
import { SectionToggle } from "@/features/ocr/components/common/section-toggle";
import { OCRFormData } from "@/features/ocr/types";

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
  return (
    <div className="space-y-3">
      <SectionToggle
        title="Lab values"
        icon={FileText}
        isOpen={isOpen}
        onToggle={onToggle}
      />
      {isOpen && (
        <div className="space-y-3 bg-muted/30 rounded-lg p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Glucose (mg/dL)</Label>
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
                placeholder="Glucose"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Hemoglobin (g/dL)</Label>
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
                placeholder="Hemoglobin"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Creatinine (mg/dL)</Label>
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
                placeholder="Creatinine"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
