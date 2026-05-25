import type { PatientTag } from '@workspace/types';

export const PATIENT_TAGS_REPOSITORY_TOKEN = Symbol('PATIENT_TAGS_REPOSITORY');

export interface IPatientTagsRepository {
  patientExists(params: {
    clinicId: string;
    patientId: string;
  }): Promise<boolean>;
  findTag(params: {
    patientId: string;
    tagId: string;
  }): Promise<PatientTag | null>;
  list(params: { patientId: string }): Promise<PatientTag[]>;
  create(params: {
    patientId: string;
    tag: string;
    color: string;
  }): Promise<PatientTag>;
  update(params: {
    tagId: string;
    tag?: string;
    color?: string;
  }): Promise<PatientTag>;
  remove(params: { tagId: string }): Promise<void>;
}
