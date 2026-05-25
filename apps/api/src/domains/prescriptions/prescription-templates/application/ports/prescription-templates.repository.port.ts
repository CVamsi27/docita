export interface MedicationData {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface CreatePrescriptionTemplateData {
  name: string;
  medications: MedicationData[];
  instructions?: string;
}

export interface UpdatePrescriptionTemplateData {
  name?: string;
  medications?: MedicationData[];
  instructions?: string;
}

export type PrescriptionTemplateRecord = Record<string, unknown> & {
  id: string;
  userId: string;
};

export interface IPrescriptionTemplatesRepository {
  findAll(userId: string): Promise<PrescriptionTemplateRecord[]>;
  findById(id: string): Promise<PrescriptionTemplateRecord | null>;
  create(
    userId: string,
    data: CreatePrescriptionTemplateData,
  ): Promise<PrescriptionTemplateRecord>;
  update(
    id: string,
    data: UpdatePrescriptionTemplateData,
  ): Promise<PrescriptionTemplateRecord>;
  delete(id: string): Promise<PrescriptionTemplateRecord>;
}

export const PRESCRIPTION_TEMPLATES_REPOSITORY_TOKEN =
  'IPrescriptionTemplatesRepository';
