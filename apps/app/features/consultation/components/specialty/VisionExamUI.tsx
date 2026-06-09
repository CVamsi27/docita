import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";

import { OphthalmologyExamData } from "@workspace/types";
import {
  updateVisionExamField,
  type VisionExamFieldKey,
  type VisionEyeKey,
} from "./vision-exam-fields";
import {
  VisionAcuityMobileCards,
  VisionAcuityTable,
  VisionIntraocularPressureFields,
  VisionPupillaryDistanceFields,
  type VisionEyeMeta,
} from "./VisionExamUISections";

interface VisionExamProps {
  value: OphthalmologyExamData;
  onChange: (value: OphthalmologyExamData) => void;
  readOnly?: boolean;
}

const VISION_EYES: VisionEyeMeta[] = [
  { key: "OD", label: "OD (Right Eye)", color: "text-info" },
  { key: "OS", label: "OS (Left Eye)", color: "text-success" },
];

export function VisionExamUI({ value, onChange, readOnly }: VisionExamProps) {
  const handleFieldChange = (
    eye: VisionEyeKey,
    field: VisionExamFieldKey,
    val: string,
  ) => {
    if (readOnly) return;
    onChange(updateVisionExamField(value, eye, field, val));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Refraction & Visual Acuity</CardTitle>
      </CardHeader>
      <CardContent>
        <VisionAcuityMobileCards
          eyes={VISION_EYES}
          value={value}
          onFieldChange={handleFieldChange}
          readOnly={readOnly}
        />
        <VisionAcuityTable
          eyes={VISION_EYES}
          value={value}
          onFieldChange={handleFieldChange}
          readOnly={readOnly}
        />

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <VisionPupillaryDistanceFields
            value={value}
            onChange={onChange}
            readOnly={readOnly}
          />
          <VisionIntraocularPressureFields
            value={value}
            onChange={onChange}
            readOnly={readOnly}
          />
        </div>
      </CardContent>
    </Card>
  );
}
