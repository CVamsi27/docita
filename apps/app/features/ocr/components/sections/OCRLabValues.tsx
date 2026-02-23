import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { FileText } from "lucide-react";
import { ConfidenceIndicator } from "../ConfidenceIndicator";
import { SectionToggle } from "../SectionToggle";
import { OCRFormData } from "../../types";

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
        title="Lab Values"
        icon={FileText}
        isOpen={isOpen}
        onToggle={onToggle}
      />
      {isOpen && (
        <div className="space-y-3 bg-muted/30 rounded-lg p-3">
          <div className="grid grid-cols-3 gap-3">
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
                placeholder="100"
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
                placeholder="13.5"
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
                placeholder="0.8"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
