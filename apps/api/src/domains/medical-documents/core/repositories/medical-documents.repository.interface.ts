import { MedicalDocument, Prisma } from '@workspace/db';

export interface IMedicalDocumentsRepository {
  create(data: Prisma.MedicalDocumentCreateInput): Promise<MedicalDocument>;

  findAllForPatient(
    clinicId: string,
    patientId: string,
  ): Promise<MedicalDocument[]>;

  findOne(id: string, clinicId: string): Promise<MedicalDocument | null>;

  update(
    id: string,
    data: Prisma.MedicalDocumentUpdateInput,
  ): Promise<MedicalDocument>;

  delete(id: string): Promise<MedicalDocument>;
}

export const MEDICAL_DOCUMENTS_REPOSITORY_TOKEN = Symbol(
  'IMedicalDocumentsRepository',
);
