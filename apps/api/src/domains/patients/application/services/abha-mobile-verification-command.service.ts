import { Injectable } from '@nestjs/common';
import type { AbhaVerificationResult } from '@workspace/types';
import { AbhaMobileVerificationService } from './abha-mobile-verification.service';

@Injectable()
export class AbhaMobileVerificationCommandService {
  constructor(private readonly mobile: AbhaMobileVerificationService) {}

  requestOtp(
    patientId: string,
    clinicId: string,
    mobile: string,
  ): Promise<{ txnId: string; maskedTarget: string | null }> {
    return this.mobile.requestOtp(patientId, clinicId, mobile);
  }

  verifyOtp(
    patientId: string,
    clinicId: string,
    txnId: string,
    otp: string,
    actorUserId: string,
  ): Promise<AbhaVerificationResult> {
    return this.mobile.verifyOtp(patientId, clinicId, txnId, otp, actorUserId);
  }
}
