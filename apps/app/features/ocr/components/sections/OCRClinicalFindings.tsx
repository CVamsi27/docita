import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import { FileText } from "lucide-react";
import { ConfidenceIndicator } from "../ConfidenceIndicator";
import { SectionToggle } from "../SectionToggle";

interface OCRClinicalFindingsProps {
  formData: any;
  setFormData: (data: any) => void;
  getScore: (key: string) => number | undefined;
  isOpen: boolean;
  onToggle: () => void;
}

export const OCRClinicalFindings = ({
  formData,
  setFormData,
  getScore,
  isOpen,
  onToggle,
}: OCRClinicalFindingsProps) => {
  const diagnosisScore = getScore("diagnosis");

  return (
    <div className="space-y-3">
      <SectionToggle
        title="Clinical Findings"
        icon={FileText}
        isOpen={isOpen}
        onToggle={onToggle}
        {...((s: number | undefined) =>
          s && s < 0.6 ? { badge: "Check" } : {})(diagnosisScore)}
      />
      {isOpen && (
        <div className="space-y-3 bg-muted/30 rounded-lg p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Diagnosis</Label>
              <ConfidenceIndicator
                {...((s) => (s != null ? { score: s } : {}))(diagnosisScore)}
              />
            </div>
            <Textarea
              value={formData.diagnosis}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  diagnosis: e.target.value,
                })
              }
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Allergies</Label>
            <Textarea
              value={formData.allergies.join(", ")}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  allergies: e.target.value
                    .split(",")
                    .map((a: string) => a.trim()),
                })
              }
              placeholder="Separated by commas"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Medical History</Label>
            <Textarea
              value={formData.medicalHistory.join(", ")}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  medicalHistory: e.target.value
                    .split(",")
                    .map((m: string) => m.trim()),
                })
              }
              placeholder="Previous conditions, surgeries, etc."
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  );
};
