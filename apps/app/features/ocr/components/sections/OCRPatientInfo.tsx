import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
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

export const OCRPatientInfo = ({
  formData,
  setFormData,
  getScore,
  getCorrection,
  isOpen,
  onToggle,
  hasLowConfidence,
}: OCRPatientInfoProps) => {
  return (
    <div className="space-y-3">
      <SectionToggle
        title="Patient Information"
        icon={User}
        isOpen={isOpen}
        onToggle={onToggle}
        {...(hasLowConfidence ? { badge: "Check" } : {})}
      />
      {isOpen && (
        <div className="space-y-3 bg-muted/30 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">First Name</Label>
                <ConfidenceIndicator
                  {...((s) => (s != null ? { score: s } : {}))(
                    getScore("firstName"),
                  )}
                />
              </div>
              {getCorrection("firstName") && (
                <div className="text-xs surface-warning p-2 rounded">
                  <p className="font-medium">
                    Suggestion:
                  </p>
                  <p>
                    {getCorrection("firstName")}
                  </p>
                </div>
              )}
              <Input
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    firstName: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Last Name</Label>
                <ConfidenceIndicator
                  {...((s) => (s != null ? { score: s } : {}))(
                    getScore("lastName"),
                  )}
                />
              </div>
              {getCorrection("lastName") && (
                <div className="text-xs surface-warning p-2 rounded">
                  <p className="font-medium">
                    Suggestion:
                  </p>
                  <p>
                    {getCorrection("lastName")}
                  </p>
                </div>
              )}
              <Input
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lastName: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Age</Label>
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
                <Label className="text-xs">Phone</Label>
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
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Blood Type</Label>
              <Input
                value={formData.bloodType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bloodType: e.target.value,
                  })
                }
                placeholder="Blood type"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
