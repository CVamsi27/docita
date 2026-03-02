import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Coffee } from "lucide-react";
import {
  ALCOHOL_USE_STATUS_LABELS,
  AlcoholUseStatus,
  PatientSocialHistory,
  PatientWithMedicalHistory,
  SMOKING_STATUS_LABELS,
  SmokingStatus,
} from "@workspace/types";

interface PatientSocialHistoryProps {
  patient: PatientWithMedicalHistory;
  readOnly: boolean;
  onSocialHistoryUpdate: (
    field: keyof PatientSocialHistory,
    value: string,
  ) => void;
}

export function PatientSocialHistoryComp({
  patient,
  readOnly,
  onSocialHistoryUpdate,
}: PatientSocialHistoryProps) {
  return (
    <Card className="mt-6">
      <CardHeader className="py-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Coffee className="h-5 w-5 text-warning" />
          Social History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smokingStatus">Smoking Status</Label>
            <Select
              value={patient.socialHistory?.smokingStatus || "UNKNOWN"}
              onValueChange={(value) =>
                onSocialHistoryUpdate("smokingStatus", value)
              }
              disabled={readOnly}
            >
              <SelectTrigger id="smokingStatus">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SMOKING_STATUS_LABELS) as SmokingStatus[]).map(
                  (status) => (
                    <SelectItem key={status} value={status}>
                      {SMOKING_STATUS_LABELS[status]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alcoholUse">Alcohol Use</Label>
            <Select
              value={patient.socialHistory?.alcoholUse || "UNKNOWN"}
              onValueChange={(value) =>
                onSocialHistoryUpdate("alcoholUse", value)
              }
              disabled={readOnly}
            >
              <SelectTrigger id="alcoholUse">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(ALCOHOL_USE_STATUS_LABELS) as AlcoholUseStatus[]
                ).map((status) => (
                  <SelectItem key={status} value={status}>
                    {ALCOHOL_USE_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="occupation">Occupation</Label>
            <Input
              id="occupation"
              placeholder="Occupation"
              value={patient.socialHistory?.occupation || ""}
              onChange={(e) =>
                onSocialHistoryUpdate("occupation", e.target.value)
              }
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
            <Input
              id="dietaryRestrictions"
              placeholder="e.g. Vegetarian, Gluten-free"
              value={patient.socialHistory?.dietaryRestrictions || ""}
              onChange={(e) =>
                onSocialHistoryUpdate("dietaryRestrictions", e.target.value)
              }
              disabled={readOnly}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
