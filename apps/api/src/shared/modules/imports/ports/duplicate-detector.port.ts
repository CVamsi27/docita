import type { DuplicateCheckResult, MappedPatientData } from '../import-types';

export const DUPLICATE_DETECTOR_TOKEN = 'IDuplicateDetector';

export interface IDuplicateDetector {
  checkForDuplicates(
    data: MappedPatientData,
    clinicId?: string,
  ): Promise<DuplicateCheckResult>;
}
