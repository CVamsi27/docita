import { LabTest } from '@/domains/clinical/core/entities/lab-test.entity';

export interface LabTestCatalogRepository {
  findAllTests(clinicId: string): Promise<LabTest[]>;
  findTestById(id: string): Promise<LabTest | null>;
  saveTest(labTest: LabTest): Promise<LabTest>;
  deleteTest(id: string): Promise<void>;
}
