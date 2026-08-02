import { GeneralExaminationCard, SystemicExaminationCard } from "./ExaminationInputSections";
import type { ExaminationData } from "./examination-input.types";

export type { ExaminationData } from "./examination-input.types";

interface ExaminationInputProps {
  value: ExaminationData;
  onChange: (data: ExaminationData) => void;
  readOnly?: boolean;
}

const DEFAULT_VALUE: ExaminationData = {
  general: {
    pallor: false,
    icterus: false,
    cyanosis: false,
    clubbing: false,
    lymphadenopathy: false,
    edema: false,
    notes: "",
  },
  systemic: {
    cvs: "",
    rs: "",
    pa: "",
    cns: "",
    musculoskeletal: "",
    notes: "",
  },
};

export function ExaminationInput({
  value,
  onChange,
  readOnly = false,
}: ExaminationInputProps) {
  const data = {
    general: { ...DEFAULT_VALUE.general, ...(value?.general || {}) },
    systemic: { ...DEFAULT_VALUE.systemic, ...(value?.systemic || {}) },
  };

  const updateGeneral = (
    field: string,
    checked: boolean | string,
  ) => {
    onChange({
      ...data,
      general: { ...data.general, [field]: checked },
    });
  };

  const updateSystemic = (field: string, text: string) => {
    onChange({
      ...data,
      systemic: { ...data.systemic, [field]: text },
    });
  };

  return (
    <div className="space-y-3">
      <GeneralExaminationCard
        general={data.general}
        onUpdateGeneral={updateGeneral}
        readOnly={readOnly}
      />
      <SystemicExaminationCard
        systemic={data.systemic}
        onUpdateSystemic={updateSystemic}
        readOnly={readOnly}
      />
    </div>
  );
}
