import { Injectable } from '@nestjs/common';
import type {
  AbhaVerificationResult,
  VerifyAbhaRequest,
} from '@workspace/types';
import { AbhaVerificationService } from './abha-verification.service';

@Injectable()
export class AbhaVerificationCommandService {
  constructor(private readonly verification: AbhaVerificationService) {}

  verifyForPatient(
    patientId: string,
    clinicId: string,
    input: VerifyAbhaRequest,
    actorUserId: string,
  ): Promise<AbhaVerificationResult> {
    return this.verification.verifyForPatient(
      patientId,
      clinicId,
      input,
      actorUserId,
    );
  }
}
