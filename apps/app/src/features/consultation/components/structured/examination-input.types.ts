export interface ExaminationData {
  general: {
    pallor: boolean;
    icterus: boolean;
    cyanosis: boolean;
    clubbing: boolean;
    lymphadenopathy: boolean;
    edema: boolean;
    notes?: string;
  };
  systemic: {
    cvs: string;
    rs: string;
    pa: string;
    cns: string;
    musculoskeletal?: string;
    notes?: string;
  };
}
