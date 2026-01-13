import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Activity } from "lucide-react";
import { ConfidenceIndicator } from "../ConfidenceIndicator";
import { SectionToggle } from "../SectionToggle";

interface OCRVitalsProps {
  formData: any;
  setFormData: (data: any) => void;
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
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">BP</Label>
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
                placeholder="120/80"
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
                placeholder="98.6"
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
                placeholder="72"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Respiratory Rate</Label>
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
                placeholder="16"
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
                placeholder="98"
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
                placeholder="100"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
