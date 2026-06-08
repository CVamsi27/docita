// jscpd:ignore-start
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
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

export const OCRVitals = ({
  formData,
  setFormData,
  getScore,
  isOpen,
  onToggle,
}: OCRVitalsProps) => {
  return (
    <div className="space-y-3">
      <SectionToggle
        title="Vitals"
        icon={Activity}
        isOpen={isOpen}
        onToggle={onToggle}
      />
      {isOpen && (
        <div className="space-y-3 bg-muted/30 rounded-lg p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">BP</Label>
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
                placeholder="BP"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Temp (°F)</Label>
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
                placeholder="Temperature"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Pulse</Label>
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
                placeholder="Pulse"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs">Respiratory rate</Label>
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
                placeholder="Respiratory rate"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">SpO2 (%)</Label>
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
                placeholder="SpO2"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Glucose</Label>
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
                placeholder="Glucose"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
