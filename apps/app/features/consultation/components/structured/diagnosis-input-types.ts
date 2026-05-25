export interface DiagnosisItem {
  id: string;
  condition: string;
  type: "provisional" | "final" | "differential";
  status: "active" | "resolved" | "chronic";
  notes?: string;
  icdCode?: {
    id: string;
    code: string;
    description: string;
  };
}

export interface DiagnosisInputProps {
  value: DiagnosisItem[];
  onChange: (items: DiagnosisItem[]) => void;
  readOnly?: boolean;
}
